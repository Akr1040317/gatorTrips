import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import CloseButton from 'react-bootstrap/CloseButton';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';
import './index.css'; // Make sure this contains the new styling (shown below)

function TripPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [trip, setTrip] = useState(null);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [collaborator, setCollaborator] = useState('');
  const [collaboratorsData, setCollaboratorsData] = useState([]);

  useEffect(() => {
    const fetchAndInitializeTrip = async () => {
      const docRef = doc(db, 'trips', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        let tripData = { id: docSnap.id, ...docSnap.data() };
        if (!tripData.days || tripData.days.length === 0) {
          tripData = initializeTripDays(tripData);
          await updateDoc(docRef, tripData);
        }
        setTrip(tripData);
        await fetchCollaborators(tripData.collaborators);
      } else {
        console.log('No such document!');
      }
    };
    fetchAndInitializeTrip();
  }, [id]);

  const initializeTripDays = (trip) => {
    const { startDate, endDate } = trip;
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setUTCHours(0, 0, 0, 0);

    let daysArray = [];
    for (let d = new Date(start); d.getTime() <= end.getTime();) {
      daysArray.push({ date: new Date(d).toISOString().split('T')[0], events: [] });
      d.setUTCDate(d.getUTCDate() + 1);
    }
    trip.days = daysArray;
    return trip;
  };

  const fetchCollaborators = async (collaborators) => {
    if (!collaborators || collaborators.length === 0) {
      setCollaboratorsData([]);
      return;
    }

    const collaboratorsQuery = query(
      collection(db, 'users'),
      where('userid', 'in', collaborators)
    );

    const collaboratorsSnapshot = await getDocs(collaboratorsQuery);
    const collaboratorsData = collaboratorsSnapshot.docs.map(doc => doc.data());

    setCollaboratorsData(collaboratorsData);
  };

  const handleAddCollaborator = async (e) => {
    e.preventDefault();

    let usersSnapshot;

    // First, try to find by displayName
    const usersQuery = query(
      collection(db, 'users'),
      where('displayName', '==', collaborator)
    );
    usersSnapshot = await getDocs(usersQuery);

    if (usersSnapshot.empty) {
      // If not found, try by email
      const usersEmailQuery = query(
        collection(db, 'users'),
        where('email', '==', collaborator)
      );
      usersSnapshot = await getDocs(usersEmailQuery);

      if (usersSnapshot.empty) {
        return alert('No user found by username or email!');
      }
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    // Check if already a collaborator
    if (trip.collaborators.includes(userData.userid)) {
      return alert('User is already a collaborator!');
    }

    const updatedCollaborators = [...trip.collaborators, userData.userid];
    const updatedTrip = { ...trip, collaborators: updatedCollaborators };

    await updateTrip(updatedTrip);
    setCollaborator('');
    fetchCollaborators(updatedTrip.collaborators);
  };

  const handleRemoveCollaborator = async (uid) => {
    const updatedCollaborators = trip.collaborators.filter(collab => collab !== uid);
    const updatedTrip = { ...trip, collaborators: updatedCollaborators };

    await updateTrip(updatedTrip);
    fetchCollaborators(updatedTrip.collaborators);
  };

  const handleLeaveTrip = async () => {
    const user = auth.currentUser.uid;
    const updatedCollaborators = trip.collaborators.filter(collab => collab !== user);
    const updatedTrip = { ...trip, collaborators: updatedCollaborators };

    await updateTrip(updatedTrip);
    navigate('/trips');
  };

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!isValidTimeRange(eventStartTime, eventEndTime)) {
      alert('Invalid time range or overlapping events.');
      return;
    }

    const newEvent = { title: eventTitle, startTime: eventStartTime, endTime: eventEndTime };

    const updatedDays = [...trip.days];
    updatedDays[selectedDayIndex] = {
      ...updatedDays[selectedDayIndex],
      events: [...updatedDays[selectedDayIndex].events, newEvent]
    };

    updateTrip({ ...trip, days: updatedDays });
    setEventTitle('');
    setEventStartTime('');
    setEventEndTime('');
    setShowAddEventModal(false);
  };

  const handleRemoveEvent = (dayIndex, eventIndex) => {
    const updatedDays = [...trip.days];
    updatedDays[dayIndex].events.splice(eventIndex, 1);
    updateTrip({ ...trip, days: updatedDays });
  };

  const isValidTimeRange = (startTime, endTime) => {
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    if (start >= end) return false;

    const day = trip.days[selectedDayIndex];
    for (let event of day.events) {
      const existingStart = parseTime(event.startTime);
      const existingEnd = parseTime(event.endTime);
      // Check for overlap
      if (
        (start >= existingStart && start < existingEnd) ||
        (end > existingStart && end <= existingEnd) ||
        (start < existingStart && end > existingEnd)
      ) {
        return false;
      }
    }
    return true;
  };

  const parseTime = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const updateTrip = async (updatedTrip) => {
    const docRef = doc(db, 'trips', trip.id);
    await updateDoc(docRef, updatedTrip);
    setTrip(updatedTrip);
  };

  const handleShowAddEventModal = (dayIndex) => {
    setSelectedDayIndex(dayIndex);
    setShowAddEventModal(true);
  };

  const handleShowPreferencesModal = () => {
    setShowPreferencesModal(true);
  };

  if (!trip) {
    return <p>Loading trip details...</p>;
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar Navigation */}
      <aside className="dashboard-sidebar">
        <h2>Trip Dashboard</h2>
        <Link to="/trips" className="nav-link">Your Trips</Link>
        <Link to="#" className="nav-link">Trip Details</Link>
      </aside>
      
      {/* Main Section */}
      <div className="dashboard-main">
        <header className="dashboard-header">
          <Link to="/trips" className="btn btn-outline-primary">Back to Trips</Link>
          <Button variant="outline-secondary" onClick={handleShowPreferencesModal}>
            Preferences
          </Button>
        </header>
        
        <main className="dashboard-content">
          <Container className="my-5">
            {/* Trip Title & Dates */}
            <Row className="mb-4">
              <Col>
                <h1 className="text-center">Your Trip to {trip.name}</h1>
                <h4 className="text-center">
                  {new Date(trip.startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })} - 
                  {new Date(trip.endDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
                </h4>
              </Col>
            </Row>

            {/* Days & Events */}
            <Row className="g-4">
              {trip.days.map((day, dayIndex) => (
                <Col key={dayIndex} md={4}>
                  <Card className="dashboard-card trip-day-card">
                    <Card.Body>
                      <Card.Title className="fs-5">
                        {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
                      </Card.Title>
                      {day.events && day.events.map((event, eventIndex) => (
                        <div key={eventIndex} className="d-flex justify-content-between align-items-center mb-2">
                          <p className="mb-0">
                            <strong>{event.title}</strong> <br />
                            <span className="text-muted">{event.startTime} - {event.endTime}</span>
                          </p>
                          <CloseButton onClick={() => handleRemoveEvent(dayIndex, eventIndex)} />
                        </div>
                      ))}
                      <Button variant="primary" size="sm" onClick={() => handleShowAddEventModal(dayIndex)}>
                        Add Event
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </Container>
        </main>
      </div>

      {/* Add Event Modal */}
      <Modal show={showAddEventModal} onHide={() => setShowAddEventModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Event</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddEvent}>
            <Form.Group className="mb-3" controlId="formEventTitle">
              <Form.Label>Event Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter event title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formEventStartTime">
              <Form.Label>Start Time</Form.Label>
              <Form.Control
                type="time"
                value={eventStartTime}
                onChange={(e) => setEventStartTime(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formEventEndTime">
              <Form.Label>End Time</Form.Label>
              <Form.Control
                type="time"
                value={eventEndTime}
                onChange={(e) => setEventEndTime(e.target.value)}
                required
              />
            </Form.Group>
            <Button variant="primary" type="submit">
              Save Event
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Preferences Modal */}
      <Modal show={showPreferencesModal} onHide={() => setShowPreferencesModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Trip Preferences</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5>Collaborators</h5>
          {collaboratorsData.map((collab, index) => (
            <div key={index} className="d-flex justify-content-between align-items-center mb-2">
              <span>{collab.displayName}</span>
              {trip.userID === auth.currentUser.uid && (
                <CloseButton onClick={() => handleRemoveCollaborator(collab.userid)} />
              )}
            </div>
          ))}
          {trip.userID === auth.currentUser.uid && (
            <Form onSubmit={handleAddCollaborator} className="mt-3">
              <Form.Group className="mb-3" controlId="formCollaborator">
                <Form.Label>Add Collaborator</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter username or email"
                  value={collaborator}
                  onChange={(e) => setCollaborator(e.target.value)}
                  required
                />
              </Form.Group>
              <Button variant="primary" type="submit">Add</Button>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          {collaboratorsData.some(collab => collab.userid === auth.currentUser.uid) && (
            <Button variant="danger" onClick={handleLeaveTrip}>
              Leave Trip
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowPreferencesModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default TripPage;
