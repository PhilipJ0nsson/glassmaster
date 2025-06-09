# Glasmästarappen (Glass Master App)


Glasmästarappen is a comprehensive web application designed to help glazing businesses manage their operations efficiently. It provides tools for managing customers, work orders, pricing, scheduling, and more.


## Features


*   **Dashboard:** An overview of upcoming activities, pending actions, and user-specific history.
*   **Calendar:** Schedule work orders, meetings, and other events. Filter by technician.
*   **Work Orders:** Create, edit, and manage work orders through various statuses (e.g., Measurement, Quoting, Active, Completed, Invoiced). Includes features for ROT deductions, adding line items from a price list, and attaching images.
*   **Customers:** Manage a customer database with support for both private individuals and companies.
*   **Price List:** Maintain a list of products and services with pricing (including VAT calculations) and categorization.
*   **PDF Generation:** Generate PDF documents for Quotes, Work Orders, and Invoices.
*   **User Management (Admin):** Manage user accounts and roles (Admin, Work Supervisor, Technician).
*   **Authentication & Authorization:** Secure login and role-based access control.


## Tech Stack


*   **Frontend:** Next.js (React), TypeScript, Tailwind CSS, shadcn/ui
*   **Backend:** Next.js API Routes, Prisma ORM
*   **Database:** PostgreSQL
*   **Authentication:** NextAuth.js
*   **Form Handling:** React Hook Form, Zod
*   **Calendar:** FullCalendar
*   **PDF Generation:** @react-pdf/renderer


## Getting Started


These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.


### Prerequisites


*   Node.js (v18.x or later recommended)
*   A package manager: `npm` (included with Node.js) or `pnpm`.
*   PostgreSQL database server running.


### Installation


1.  **Clone the repository:**
    ```bash
    git clone https://github.com/PhilipJ0nsson/glassmaster
    cd glasmastarappen # Or your project's root directory name
    ```


2.  **Install dependencies:**
    Use the package manager of your choice.
    ```bash
    # Using npm (standard)
    npm install


    # Or using pnpm
    pnpm install
    ```


3.  **Set up the database:**
    *   Ensure your PostgreSQL server is running.
    *   Create a new database for the project (e.g., `glasmastaren_dev`).


4.  **Set up environment variables:**
    Create a `.env` file in the root of your project and add the following variables.
    **Important:** Replace the placeholder values with your actual configuration.


    ```env
    # .env


    # PostgreSQL Connection URL
    # Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
    # Example for local setup: postgresql://postgres:mysecretpassword@localhost:5432/glasmastaren_dev?schema=public
    DATABASE_URL="postgresql://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_DB_HOST:YOUR_DB_PORT/YOUR_DB_NAME?schema=public"


    # NextAuth.js Secret
    # Generate a strong secret, e.g., using: openssl rand -base64 32
    # Keep this secret safe and do not commit it to version control if it's a real production secret.
    NEXTAUTH_SECRET="YOUR_VERY_STRONG_NEXTAUTH_SECRET"


    # NextAuth.js URL (Base URL of your application)
    # For local development, this is typically http://localhost:3000
    NEXTAUTH_URL="http://localhost:3000"
    ```


5.  **Apply database migrations:**
    This command will create the necessary tables in your database. You might be prompted to name your migration (e.g., `init`).
    ```bash
    # Using npm
    npm run prisma:migrate


    # Or using pnpm
    pnpm prisma:migrate
    ```


6.  **Seed the database (optional but recommended for development):**
    This will create initial test users (admin, work supervisor, technician) with the password `password`.
    ```bash
    # Using npm
    npm run db:seed


    # Or using pnpm
    pnpm db:seed
    ```


7.  **Run the development server:**
    ```bash
    # Using npm
    npm run dev


    # Or using pnpm
    pnpm dev
    ```
    The application should now be running at `http://localhost:3000`.


### Logging In


After seeding the database, you can log in with the following test credentials:


*   **Admin:**
    *   Username: `admin`
    *   Password: `password`
*   **Arbetsledare (Work Supervisor):**
    *   Username: `arbetsledare`
    *   Password: `password`
*   **Tekniker (Technician):**
    *   Username: `tekniker`
    *   Password: `password`


## Available Scripts


Here are the most common scripts available in the project.


You can run them with `npm run <script-name>` or `pnpm <script-name>`.


*   **`dev`**: Runs the app in development mode.
*   **`build`**: Builds the app for production.
*   **`start`**: Starts the production server (after building).
*   **`lint`**: Lints the codebase.
*   **`prisma:generate`**: Generates/updates the Prisma Client.
*   **`prisma:migrate`**: Applies database migrations for development.
*   **`prisma:studio`**: Opens Prisma Studio to view/edit your database.
*   **`db:seed`**: Seeds the database with initial data.


**Example using `npm`:**
`npm run lint`


**Example using `pnpm`:**
`pnpm lint`
