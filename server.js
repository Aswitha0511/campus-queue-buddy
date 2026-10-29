require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/campus_queue_buddy";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  averageServiceMinutes: { type: Number, default: 3, min: 1 },
  isOpen: { type: Boolean, default: true }
}, { timestamps: true });

const queueEntrySchema = new mongoose.Schema({
  studentName: { type: String, required: true, trim: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: "Service", required: true },
  status: { type: String, enum: ["waiting", "serving", "completed", "cancelled"], default: "waiting" },
  ticketNumber: { type: Number, required: true },
  joinedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Service = mongoose.model("Service", serviceSchema);
const QueueEntry = mongoose.model("QueueEntry", queueEntrySchema);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" });
});

// Dashboard summary
app.get("/api/dashboard", async (req, res, next) => {
  try {
    const [services, waiting, serving, completedToday] = await Promise.all([
      Service.countDocuments(),
      QueueEntry.countDocuments({ status: "waiting" }),
      QueueEntry.countDocuments({ status: "serving" }),
      QueueEntry.countDocuments({ status: "completed", updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } })
    ]);
    const activeServices = await Service.find({ isOpen: true }).lean();
    const averageWait = activeServices.length
      ? Math.round(activeServices.reduce((sum, s) => sum + s.averageServiceMinutes, 0) / activeServices.length * waiting)
      : 0;
    res.json({ services, waiting, serving, completedToday, averageWait });
  } catch (err) { next(err); }
});

// Services CRUD
app.get("/api/services", async (req, res, next) => {
  try {
    const services = await Service.find().sort({ name: 1 }).lean();
    const withCounts = await Promise.all(services.map(async s => {
      const waiting = await QueueEntry.countDocuments({ service: s._id, status: "waiting" });
      const serving = await QueueEntry.countDocuments({ service: s._id, status: "serving" });
      return { ...s, waiting, serving, estimatedWait: waiting * s.averageServiceMinutes };
    }));
    res.json(withCounts);
  } catch (err) { next(err); }
});

app.post("/api/services", async (req, res, next) => {
  try {
    const { name, location, averageServiceMinutes } = req.body;
    if (!name?.trim() || !location?.trim()) return res.status(400).json({ message: "Service name and location are required." });
    const service = await Service.create({ name, location, averageServiceMinutes: Number(averageServiceMinutes) || 3 });
    res.status(201).json(service);
  } catch (err) { next(err); }
});

app.patch("/api/services/:id", async (req, res, next) => {
  try {
    const updates = {};
    ["name", "location", "averageServiceMinutes", "isOpen"].forEach(key => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });
    const service = await Service.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!service) return res.status(404).json({ message: "Service not found." });
    res.json(service);
  } catch (err) { next(err); }
});

app.delete("/api/services/:id", async (req, res, next) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ message: "Service not found." });
    await QueueEntry.deleteMany({ service: service._id, status: { $in: ["waiting", "serving"] } });
    res.json({ message: "Service and its active queue entries deleted." });
  } catch (err) { next(err); }
});

// Queue operations
app.get("/api/queue", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status && ["waiting", "serving", "completed", "cancelled"].includes(req.query.status)) filter.status = req.query.status;
    const entries = await QueueEntry.find(filter).populate("service", "name location averageServiceMinutes").sort({ joinedAt: 1 }).limit(150).lean();
    const activeEntries = entries.filter(e => ["waiting", "serving"].includes(e.status));
    const enriched = entries.map(entry => {
      const ahead = activeEntries.filter(e => e.service?._id?.toString() === entry.service?._id?.toString() && e.status === "waiting" && e.joinedAt < entry.joinedAt).length;
      const serviceMinutes = entry.service?.averageServiceMinutes || 3;
      return { ...entry, position: entry.status === "waiting" ? ahead + 1 : entry.status === "serving" ? 0 : null, estimatedWait: entry.status === "waiting" ? ahead * serviceMinutes : 0 };
    });
    res.json(enriched);
  } catch (err) { next(err); }
});

app.post("/api/queue", async (req, res, next) => {
  try {
    const studentName = String(req.body.studentName || "").trim();
    if (!studentName) return res.status(400).json({ message: "Please enter your name." });
    if (studentName.length > 60) return res.status(400).json({ message: "Name must be 60 characters or fewer." });
    const service = await Service.findById(req.body.serviceId);
    if (!service) return res.status(404).json({ message: "Please select a valid service." });
    if (!service.isOpen) return res.status(400).json({ message: "This service is currently closed." });
    const ticketNumber = (await QueueEntry.countDocuments({ service: service._id })) + 1;
    const entry = await QueueEntry.create({ studentName, service: service._id, ticketNumber });
    const populated = await entry.populate("service", "name location averageServiceMinutes");
    res.status(201).json(populated);
  } catch (err) { next(err); }
});

app.patch("/api/queue/:id/status", async (req, res, next) => {
  try {
    const allowed = ["waiting", "serving", "completed", "cancelled"];
    if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid queue status." });
    const entry = await QueueEntry.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).populate("service", "name location averageServiceMinutes");
    if (!entry) return res.status(404).json({ message: "Queue entry not found." });
    res.json(entry);
  } catch (err) { next(err); }
});

app.delete("/api/queue/:id", async (req, res, next) => {
  try {
    const entry = await QueueEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ message: "Queue entry not found." });
    res.json({ message: "Queue entry removed." });
  } catch (err) { next(err); }
});

// Seed starter services only when the database has no services yet.
async function seedServices() {
  if (await Service.countDocuments() === 0) {
    await Service.insertMany([
      { name: "Campus Canteen", location: "Student Block · Ground Floor", averageServiceMinutes: 2, isOpen: true },
      { name: "Admin Office", location: "Main Building · Room 104", averageServiceMinutes: 5, isOpen: true },
      { name: "Library Counter", location: "Central Library · Entrance", averageServiceMinutes: 3, isOpen: true },
      { name: "IT Help Desk", location: "Computer Lab · Block B", averageServiceMinutes: 4, isOpen: true }
    ]);
    console.log("Starter campus services added.");
  }
}

app.use("/api", (req, res) => res.status(404).json({ message: "API route not found." }));
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === "CastError") return res.status(400).json({ message: "Invalid ID format." });
  if (err.name === "ValidationError") return res.status(400).json({ message: err.message });
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB.");
    await seedServices();
    app.listen(PORT, () => console.log(`Campus Queue Buddy running at http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
