import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import CloseButton from 'react-bootstrap/CloseButton';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { auth, db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import './index.css';

function TripsPage() {
  const [trips, setTrips] = useState([]);
  const [sharedTrips, setSharedTrips] = useState([]);
  const [show, setShow] = useState(false);
  const [tripName, setTripName] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => {
    const fetchTrips = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const userTripsQuery = query(
        collection(db, 'trips'),
        where('userID', '==', user.uid)
      );

      const sharedTripsQuery = query(
        collection(db, 'trips'),
        where('collaborators', 'array-contains', user.uid)
      );

      const [userTripsSnapshot, sharedTripsSnapshot] = await Promise.all([
        getDocs(userTripsQuery),
        getDocs(sharedTripsQuery)
      ]);

      const userTripsList = userTripsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      const sharedTripsList = sharedTripsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setTrips(userTripsList);
      setSharedTrips(sharedTripsList);
    };
    fetchTrips();
  }, []);

  const handleAddTrip = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    const newTrip = {
      name: tripName,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      userID: auth.currentUser.uid,
      collaborators: [],
      days: []
    };

    const docRef = await addDoc(collection(db, 'trips'), newTrip);
    setTrips([...trips, { ...newTrip, id: docRef.id }]);
    setShow(false);
    setTripName('');
    setStartDate(null);
    setEndDate(null);
  };

  const handleRemoveTrip = async (id) => {
    const confirmRemoval = window.confirm("Are you sure you want to remove this trip?");
    if (confirmRemoval) {
      const tripRef = doc(db, 'trips', id);
      await deleteDoc(tripRef);
      setTrips(trips.filter(trip => trip.id !== id));
    }
  };

  const handleLeaveTrip = async (tripId) => {
    const confirmLeave = window.confirm("Are you sure you want to leave this trip?");
    if (confirmLeave) {
      const user = auth.currentUser;
      const tripRef = doc(db, 'trips', tripId);
      const tripDoc = await getDoc(tripRef);
      if (tripDoc.exists()) {
        const tripData = tripDoc.data();
        const updatedCollaborators = tripData.collaborators.filter(uid => uid !== user.uid);
        await updateDoc(tripRef, { collaborators: updatedCollaborators });
        setSharedTrips(sharedTrips.filter(trip => trip.id !== tripId));
      }
    }
  };

  const handleShowModal = () => setShow(true);
  const handleCloseModal = () => setShow(false);

  const renderTripCard = (tripObj, isShared = false) => {
    const removeOrLeave = isShared ? () => handleLeaveTrip(tripObj.id) : () => handleRemoveTrip(tripObj.id);

    return (
      <Col md={4} key={tripObj.id}>
        <Card className="trip-card position-relative">
          <CloseButton
            className="position-absolute top-0 end-0 m-1"
            onClick={removeOrLeave}
          />
          <Card.Body>
            <Card.Title className="text-teal fw-bold fs-5">{tripObj.name}</Card.Title>
            <Card.Text className="text-muted">
              {new Date(tripObj.startDate).toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit'
              })} -{' '}
              {new Date(tripObj.endDate).toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit'
              })}
            </Card.Text>
            <Link to={`/trip/${tripObj.id}`} className="btn btn-primary">
              View Trip
            </Link>
          </Card.Body>
        </Card>
      </Col>
    );
  };

  return (
    <div className="dashboard-container">
      <aside className="dashboard-sidebar">
        <h2>Your Trips</h2>
        <Link to="/trips" className="nav-link">Home</Link>
        <button className="nav-link" onClick={handleShowModal}>Plan A New Trip</button>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1 className="m-0">Your Trips</h1>
          </div>
          <div>
            <Button variant="primary" onClick={handleShowModal}>
              + New Trip
            </Button>
          </div>
        </header>

        <main className="dashboard-content">
          <Container>
            <Row className="my-4">
              <Col>
                <h2 className="mb-4">My Trips</h2>
              </Col>
            </Row>
            {trips.length > 0 ? (
              <Row className="g-3">
                {trips.map((trip) => renderTripCard(trip, false))}
              </Row>
            ) : (
              <Row>
                <Col>
                  <p className="text-center mt-2">No trips yet. Click “+ New Trip” to start planning.</p>
                </Col>
              </Row>
            )}

            <Row className="my-5">
              <Col>
                <h2 className="mb-4">Shared Trips</h2>
              </Col>
            </Row>
            {sharedTrips.length > 0 ? (
              <Row className="g-3">
                {sharedTrips.map((trip) => renderTripCard(trip, true))}
              </Row>
            ) : (
              <Row>
                <Col>
                  <p className="text-center mt-2">No shared trips available.</p>
                </Col>
              </Row>
            )}
          </Container>
        </main>
      </div>

      <Modal show={show} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Plan A New Trip</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddTrip}>
            <Form.Group className="mb-3" controlId="formTripName">
              <Form.Label>Trip Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter trip name"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formStartDate">
              <Form.Label>Start Date</Form.Label>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                placeholderText="Select start date"
                className="form-control"
                required
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="formEndDate">
              <Form.Label>End Date</Form.Label>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                placeholderText="Select end date"
                className="form-control"
                required
              />
            </Form.Group>
            <Button variant="primary" type="submit">
              Save Trip
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default TripsPage;