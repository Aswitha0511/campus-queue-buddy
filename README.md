# Campus Queue Buddy

A web-based campus queue management system designed to help students manage waiting time and make campus services more organized and convenient.

## About the Project

Campus Queue Buddy is a web application that provides a centralized platform for managing queues at different campus facilities, such as the canteen, administrative office, library counter, and IT help desk.

Students can select a service, join its queue, receive a ticket, and view queue information and estimated waiting time. The application also provides service management features to help maintain organized queues.

The project demonstrates the integration of frontend development, backend APIs, database operations, and containerization.

## Objectives

- Reduce uncertainty and inconvenience associated with waiting in campus queues.
- Provide a simple interface for joining and viewing queues.
- Display queue ticket information and estimated waiting times.
- Enable management of campus services and their availability.
- Demonstrate full-stack web development using modern technologies.
- Use Docker to simplify application and database deployment.

## Key Features

### 1. Dashboard
Displays campus services, queue information, and estimated waiting times in a user-friendly interface.

### 2. Queue Management
Allows users to join a selected service queue and generate a queue ticket.

### 3. Ticket Status Tracking
Displays queue tickets and their current statuses, such as waiting, serving, and completed.

### 4. Waiting-Time Estimation
Provides an estimated waiting time based on the queue information maintained by the application.

### 5. Service Management
Supports adding services, updating service information, and changing service availability.

### 6. Backend API Integration
Uses REST API endpoints to handle frontend requests and manage application data.

### 7. Database Integration
Uses MongoDB to store and retrieve service and queue ticket information.

### 8. Containerization
Uses Docker and Docker Compose to configure and run the application and database in containers.

## Technologies Used

| HTML5 | Defines the structure of the website |
| CSS3 | Provides styling, layout, and responsive design |
| JavaScript | Handles frontend interactions and API communication |
| Node.js | Runs the server-side JavaScript application |
| Express.js | Implements backend routes and REST APIs |
| MongoDB | Stores service and queue ticket data |
| Docker | Containerizes the application |
| Docker Compose | Configures the application and database services |

## System Architecture

The application follows a frontend-backend-database architecture.

1. **Frontend:** The user interacts with the website through the dashboard and queue management interface.
2. **Backend:** Node.js and Express.js process requests, perform application operations, and provide API responses.
3. **Database:** MongoDB stores and retrieves the service and queue information.
4. **Containerization:** Docker packages the application environment, while Docker Compose coordinates the application and database containers.

### Application Flow

User → Frontend Interface → Express.js API → MongoDB → API Response → Updated Interface

## Project Structure

```text
campus-queue-buddy/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── server.js
├── package.json
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── .gitignore
└── README.md
```

### File Description

- `server.js` — Configures the Express server, database connection, and backend API routes.
- `public/index.html` — Defines the website structure and dashboard sections.
- `public/styles.css` — Contains styling and layout rules.
- `public/app.js` — Handles user interactions, API requests, and interface updates.
- `package.json` — Defines project metadata, dependencies, and application scripts.
- `Dockerfile` — Defines how the application container is built.
- `docker-compose.yml` — Configures the application and MongoDB services.
- `.env.example` — Provides an example of the environment configuration.
- `.dockerignore` — Specifies files excluded from the Docker build context.
- `.gitignore` — Specifies files excluded from version control.

## Implementation Overview

### Frontend Implementation
The frontend uses HTML, CSS, and JavaScript to create an interactive dashboard. It allows users to view services, join queues, inspect tickets, and manage available service information.

### Backend Implementation
The Express.js backend handles requests from the frontend through REST API routes. It performs the required operations for services and queue tickets and returns responses to the client.

### Database Implementation
MongoDB provides persistent storage for application data, including service details and queue ticket information.

### Docker Implementation
Docker is used to package the application environment. Docker Compose defines the application and database services so they can operate together.

## Potential Applications

Campus Queue Buddy can be adapted for:

- College canteens and food counters
- Administrative and student service offices
- Library service counters
- IT support desks
- Other campus facilities that serve users through queues

## Future Enhancements

The project can be extended with the following features:

- Student authentication and administrator accounts
- QR-code-based queue joining
- Notifications when a student's turn is approaching
- More advanced waiting-time prediction
- Queue analytics and service usage reports
- Role-based access control
- Improved mobile support and accessibility

## Conclusion

Campus Queue Buddy demonstrates how full-stack web technologies can be used to develop a practical queue management application. By combining an interactive frontend, a Node.js and Express.js backend, MongoDB storage, and Docker containerization, the project provides a foundation for making campus service queues easier to manage.

The system can be extended further to support more services, improved predictions, and additional user-oriented features.
