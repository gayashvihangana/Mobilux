# Mobilux - Phone Repairing Shop Website

Mobilux is a full-stack web application designed for phone repair shops to manage their daily operations, including repair logs, products, payments, and dashboards. 

## 🚀 Tech Stack

### Frontend
- **Framework:** [Next.js 15](https://nextjs.org/)
- **Library:** [React 18](https://reactjs.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Language:** TypeScript

### Backend
- **Framework:** [Spring Boot 3.3.1](https://spring.io/projects/spring-boot)
- **Language:** Java 17
- **Security:** Spring Security + JWT authentication
- **Database Access:** Spring Data JPA
- **Database:** PostgreSQL

## 📂 Project Structure

- `/frontend` - The Next.js frontend application
- `/backend` - The Spring Boot backend application
- `/database` - Database schemas and initialization scripts
- `docker-compose.yml` - Docker compose file to spin up the local PostgreSQL database

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your machine:
- **Node.js** (v20 or higher recommended)
- **Java Development Kit (JDK)** 17
- **Maven**
- **Docker & Docker Compose** (for running the PostgreSQL database)

## 🏃‍♂️ How to Run Locally

### 1. Start the Database
The project includes a `docker-compose.yml` file to easily start a PostgreSQL instance.
```bash
docker-compose up -d
```
This will start a PostgreSQL database on port `5432` with the database name `mobilux`, user `mobilux`, and password `mobilux`.

### 2. Run the Backend
Navigate to the backend directory and run the Spring Boot application using Maven:
```bash
cd backend
mvn spring-boot:run
```
The backend server will start on port `8080`.

### 3. Run the Frontend
Open a new terminal, navigate to the frontend directory, install dependencies, and start the development server:
```bash
cd frontend
npm install
npm run dev
```
The frontend application will be accessible at [http://localhost:3000](http://localhost:3000).

## 📄 License

This project is licensed under the MIT License.
