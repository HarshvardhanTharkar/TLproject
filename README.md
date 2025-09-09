
Full-Stack Web app
This is a full-stack web application designed to automatically detect, perspective-correct, and enhance documents from images. It uses client-side computer vision for a fast and secure user experience, with a backend for user authentication and data persistence.

🚀 Features
User Authentication: Secure email/password login and registration using Firebase Auth.

Document Processing: Client-side document scanning, including auto-cropping, deskewing, and enhancement, powered by OpenCV.js.

PDF Support: Process the first page of a PDF document for scanning.

File Persistence: Upload both original and processed files to Firebase Storage.

Metadata Storage: Save file URLs and other metadata to Firestore.

Personal Gallery: View a history of all uploaded and processed documents.

File Deletion: Securely delete files and their associated metadata from the gallery.

🧠 Architecture Overview
The application follows a standard full-stack architecture with a clear separation of concerns.

Frontend (React.js): Handles the user interface, client-side document processing with OpenCV.js, and communication with the backend. It is hosted on Vercel.

Backend (Node.js/Express): Serves as an API layer to handle sensitive operations like user data management. It uses Firebase Admin SDK for authentication token verification and Firestore/Storage interactions. The backend is hosted as a Firebase Cloud Function.

Firebase Services:

Authentication: Manages user accounts.

Storage: Securely stores original and processed image files.

Firestore: A NoSQL database used to save metadata for each uploaded file (e.g., file URLs, timestamps, userId).

Data Flow
A user logs in via the frontend. Firebase Auth provides a token.

The user selects an image/PDF. The frontend processes the document using OpenCV.js in the browser.

The frontend uploads both the original and processed images directly to Firebase Storage.

The frontend sends a request to the Node.js backend with the file URLs.

The backend verifies the user's token and saves the metadata to a user-specific collection in Firestore.

The Gallery component in the frontend fetches the metadata from Firestore and displays the user's files.

For deletion, the frontend sends a request to the backend with the document ID. The backend verifies the user's ownership and deletes both the Firestore record and the files from Firebase Storage.

✂️ Auto-Crop Algorithm
The core document processing logic is implemented client-side using OpenCV.js. The algorithm performs the following steps:

Grayscale & Blur: The input image is converted to grayscale and blurred to reduce noise and simplify edge detection.

Canny Edge Detection: A Canny edge detector is applied to find all the edges in the image.

Contour Detection: All contours (outlines of shapes) in the image are found.

Find Largest Quadrilateral: The algorithm iterates through all detected contours to find the largest one that has four corners. This is assumed to be the document.

Perspective Transform: Once the document's four corners are identified, a perspective transformation is applied to warp the document into a perfect rectangle, creating a top-down view.

Deskew & Enhance: The resulting image is deskewed to correct for any rotation and then enhanced using Gaussian blurring, histogram equalization, and sharpening filters to improve readability.

⚙️ Setup and Deployment
Prerequisites
Node.js (v18 or higher)

npm (v8 or higher)

Firebase CLI (npm install -g firebase-tools)

Vercel CLI (npm install -g vercel)

A Firebase project with Authentication, Firestore, and Storage enabled.

Firebase Project Setup
Go to your Firebase Console and create a new project.

Enable Firebase Authentication with the Email/Password provider.

Enable Firestore Database in production mode.

Enable Firebase Storage.

Go to Project Settings > Service Accounts and generate a new private key. Save the downloaded JSON file as serviceAccount.json in your backend/functions directory.

Local Setup
Clone the repository.

Navigate to the frontend directory and install dependencies.

Bash

cd frontend
npm install
Update src/utils/firebase.js with your Firebase web app configuration.

Navigate to the backend/functions directory and install dependencies.

Bash

cd ../backend/functions
npm install
Create a .env file in backend/functions with your Firebase Storage bucket.

FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
Ensure your firebase.json in the project root is configured correctly as described in the Architecture section.

Deployment
Deploying the Backend: From the project root, run the following command to deploy your backend as a Firebase Cloud Function.

Bash

firebase deploy --only functions
Deploying the Frontend: We'll use Vercel for the frontend.

Install the Vercel CLI (npm i -g vercel).

From the project root, link your project to Vercel.

Bash

vercel
Follow the prompts. Vercel will automatically detect the React project in the frontend directory and deploy it.

📚 Libraries Used
React.js: Frontend UI library

Tailwind CSS: For styling

OpenCV.js: Client-side computer vision

pdf.js: For rendering PDF pages

Node.js/Express: Backend framework

Firebase Admin SDK: Server-side Firebase interaction

Axios: For API calls

⚖️ Trade-offs & Future Improvements
Client-Side Processing: Performing the auto-crop client-side provides a much faster and more responsive user experience, as it avoids sending large image files to the server and back. However, it requires the client to download the large OpenCV.js library (~15 MB), which can impact the initial load time.

Future Work:

Implement drag-and-drop file uploads.

Add zooming and panning functionality for the before/after view.

Enable multi-page PDF processing.

Add unit tests for the core image processing logic.
