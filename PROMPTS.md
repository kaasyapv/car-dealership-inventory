# PROMPTS

Raw prompts sent to the AI assistant (Claude Code), unedited.

---

## Prompt 1

> Create a folder on desktop and start doing this. "
>
> TDD Kata: Car Dealership Inventory System
> Objective
> The goal of this kata is to design, build, and test a full-stack Car Dealership Inventory System. This project will test your skills in API development, database management, frontend implementation, testing, and modern development workflows, including the use of AI tools.
> Core Requirements
> 1. Backend API (RESTful)
> You are to build a robust backend API that will serve as the brain of the application.
> * Technology: Choose one of the following: Node.js/TypeScript (with Express/NestJS), Python (with Django/FastAPI), or Ruby (with Rails).
> * Database: The application must connect to a database (e.g., PostgreSQL, MongoDB, SQLite). An in-memory database is not sufficient.
> * User Authentication:
> * Users must be able to register and log in.
> * Implement token-based authentication (e.g., JWT) to secure certain API endpoints.
> * API Endpoints: Auth: POST /api/auth/register, POST /api/auth/login
> * Vehicles (Protected): POST /api/vehicles, GET /api/vehicles, GET /api/vehicles/search (make, model, category, price range), PUT /api/vehicles/:id, DELETE /api/vehicles/:id (Admin only).
> * Inventory (Protected): POST /api/vehicles/:id/purchase, POST /api/vehicles/:id/restock (Admin only).
> Each vehicle must have a unique ID, make, model, category, price, and quantity in stock.
> 2. Frontend Application: HTML5, CSS3, Tailwind, React SPA with register/login, dashboard, search/filter, Purchase button disabled at zero quantity, admin add/update/delete UI, responsive and visually appealing.
> Process & Technical Guidelines: TDD with Red-Green-Refactor commit history, clean code/SOLID, frequent descriptive commits, AI co-author trailer on every AI-assisted commit, README with "My AI Usage", screenshots, test report, PROMPTS.md.
> "

*(The kata brief was pasted in full; it is abridged here only to keep this file short. The complete original text is in the session transcript.)*

---

> **Note:** Append the remainder of the chat transcript (export from Claude Code) below before submitting.
