Name: Tamizharasu M

College Name: Agni College of Technology

Contact Number: 8778638910


This project is a backend for an employee attendance system built using Node.js, Express, and MongoDB Atlas.
The project does not include any .env file. You must create it manually inside the server folder.

Setup instructions

Clone the repository:
git clone <your-repo-url>
cd EmployeeAttendanceSystem

Install server dependencies:
cd server
npm install

(Optional) Install client dependencies if you are using the included frontend:
cd ../client/client
npm install

Create an environment configuration file.
Important: There is no .env file included in this project. You must create it yourself inside the server folder.
The required environment variables are listed in the Environment variables section.

In MongoDB Atlas, whitelist your IP address or allow 0.0.0.0/0 for development purposes.

How to run

To run the backend server:
Go to the server folder and use:
npm run dev
or
node server.js

The backend will run on:
http://localhost:5000

To run the optional frontend:
Go to client/client and use:
npm start

The frontend will run on:
http://localhost:3000

Environment variables

Create a file named .env inside the server folder. Since the project does not contain this file by default, you must create it manually.

Inside server/.env, add the following keys:

PORT=5000
MONGO_URI=mongodb+srv://<DB_USER>:<DB_PASS>@<CLUSTER_HOST>/<DB_NAME>?retryWrites=true&w=majority&appName=EAS
JWT_SECRET=your_jwt_secret_here

Replace the placeholders <DB_USER>, <DB_PASS>, <CLUSTER_HOST>, and <DB_NAME> with your actual MongoDB Atlas values.
If the password contains special characters, make sure it is properly URL encoded.

API endpoints (for testing with Postman)

Authentication endpoints:
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me

Attendance endpoints:
POST /api/attendance/check-in
POST /api/attendance/check-out
GET /api/attendance/my-history
GET /api/attendance/my-summary



