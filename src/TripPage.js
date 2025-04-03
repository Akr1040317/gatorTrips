import React, { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import CloseButton from 'react-bootstrap/CloseButton';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import './index.css';

function TripPage() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');

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
      } else {
        console.log('No such document!');
      }
    };
    fetchAndInitializeTrip();
  }, [id]);

  const initializeTripDays = (trip) => {
    const { startDate, endDate } = trip;
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0); // Set start date to midnight UTC
    
    const end = new Date(endDate);
    end.setUTCHours(0, 0, 0, 0); // Set end date to midnight UTC

    console.log("Start Date:", start.toISOString());
    console.log("End Date:", end.toISOString());

    let daysArray = [];
    for (let d = new Date(start); d.getTime() <= end.getTime();) {
      daysArray.push({ date: new Date(d).toISOString().split('T')[0], events: [] });
      d.setUTCDate(d.getUTCDate() + 1); // Increment date by one day
    }
    trip.days = daysArray;
    return trip;
  };

  const handleAddEvent = (e) => {
    e.preventDefault();
    if (!isValidTimeRange(eventStartTime, eventEndTime)) {
      alert('Invalid time range or overlapping events.');
      return;
    }

    const newEvent = { title: eventTitle, startTime: eventStartTime, endTime: eventEndTime };

    const updatedDays = [...(trip.days || [])];
    updatedDays[selectedDayIndex] = {
      ...updatedDays[selectedDayIndex],
      events: [...(updatedDays[selectedDayIndex].events || []), newEvent]
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

  if (!trip) {
    return <p>Loading trip details...</p>;
  }

  return (
    <Container className="my-5">
      <Row className="mb-4">
        <Col>
          <Link to="/trips" className="btn btn-outline-primary">Trip Dashboard</Link>
        </Col>
        <Col className="text-end">
          <Button variant="outline-secondary" onClick={() => { /* Preferences logic */ }}>Preferences</Button>
        </Col>
      </Row>
      <Row className="mb-4">
        <Col>
          <h1 className="text-center">Your Trip to {trip.name}</h1>
          <h4 className="text-center">
            {new Date(trip.startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })} - 
            {new Date(trip.endDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
          </h4>
        </Col>
      </Row>

      <Row className="g-3">
        {trip.days && trip.days.map((day, dayIndex) => (
          <Col key={dayIndex} md={4}>
            <Card className="mb-3">
              <Card.Body>
                <Card.Title>{new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}</Card.Title>
                {day.events && day.events.map((event, eventIndex) => (
                  <div key={eventIndex} className="d-flex justify-content-between align-items-center">
                    <p>
                      <strong>{event.title}</strong>: {event.startTime} - {event.endTime}
                    </p>
                    <CloseButton onClick={() => handleRemoveEvent(dayIndex, eventIndex)} />
                  </div>
                ))}
                <Button onClick={() => handleShowAddEventModal(dayIndex)}>Add Event</Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

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
    </Container>
  );
}

export default TripPage;