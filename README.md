# GatorTrips

**GatorTrips** is a collaborative trip-planning web application built with React and Firebase. The platform allows users to register, log in securely, and organize travel itineraries in a structured and shareable format. Designed with simplicity and functionality in mind, GatorTrips helps users manage multi-day trips, create events for each day, and store trip information in a centralized, cloud-hosted database.

The project was developed as a senior design project at the University of Florida.

## Key Features

- **User Authentication**  
  Users can create accounts, log in, and log out securely using Firebase Authentication. The app uses React context to persist authentication state across sessions and route guards to protect private pages.

- **Trip Dashboard**  
  Once logged in, users are redirected to a dashboard where they can view all trips they have created. Each trip displays essential details such as the trip title and date range.

- **Trip Details and Events**  
  Users can click on a trip to view a detailed itinerary page. This page is organized by day and allows users to:
  - View and create events for specific days
  - Edit or remove events
  - Store event information such as title, description, and time

- **Firebase Integration**  
  Firebase Firestore is used to store all trip and user-related data. All updates are real-time and persist across devices. Firebase Hosting or another hosting service can be used to deploy the final version.

- **Modular Architecture**  
  Components like navigation, authentication, and routing are separated for easy maintenance and future scaling. Routes are protected and only accessible based on login status.

- **Responsive UI**  
  Styled using custom CSS and React-Bootstrap, the interface adapts to different screen sizes and provides a clean, user-friendly experience.

- **Secure Environment Configuration**  
  Sensitive keys and config values are hidden through the use of `.env` files and loaded via `process.env`.

```

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd gatorTrips-main
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   Create a `.env` file at the project root with the following keys from your Firebase project:
   ```
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

## Potential Improvements

- Add the ability to upload images to events or trips
- Enable notifications and reminders for upcoming trip events
- Mobile-friendly enhancements for better responsiveness
