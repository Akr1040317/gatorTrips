import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import './index.css';

function TripsPage() {
  const [trips, setTrips] = useState([]);
  const [show, setShow] = useState(false);
  const [tripName, setTripName] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const navigate = useNavigate();

  // Fetch trips when component mounts
  useEffect(() => {
    const fetchTrips = async () => {
      const tripsCollection = collection(db, 'trips');
      const tripSnapshot = await getDocs(tripsCollection);
      const tripList = tripSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrips(tripList);
    };
    fetchTrips();
  }, []);

  // Handle creating a new trip
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
      userID: auth.currentUser.uid 
    };

    const docRef = await addDoc(collection(db, "trips"), newTrip);
    setTrips([...trips, { ...newTrip, id: docRef.id }]);
    setShow(false);
    setTripName('');
    setStartDate(null);
    setEndDate(null);
  };

  // Handle removing a trip
  const handleRemoveTrip = async (id) => {
    const confirmRemoval = window.confirm("Are you sure you want to remove this trip?");
    if (confirmRemoval) {
      await deleteDoc(doc(db, "trips", id));
      setTrips(trips.filter(trip => trip.id !== id));
    }
  };

  // Handle showing modal
  const handleShowModal = () => setShow(true);

  // Handle closing modal
  const handleCloseModal = () => setShow(false);

  return (
    <>
      <Container className="my-5">
        <Row className="mb-4">
          <Col>
            <h1 className="text-center">Your Trips</h1>
          </Col>
        </Row>
        <Row className="mb-4">
          <Col className="text-center">
            <Button className="btn-cta" onClick={handleShowModal}>Plan A New Trip</Button>
          </Col>
        </Row>
        {trips.length > 0 ? (
          <Row className="g-3">
            {trips.map((trip) => (
              <Col md={4} key={trip.id}>
                <Card className="text-center position-relative">
                  <CloseButton className="position-absolute top-0 end-0 m-1" onClick={() => handleRemoveTrip(trip.id)} />
                  <Card.Body>
                    <Card.Title>{trip.name}</Card.Title>
                    <Card.Text>
                      {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                    </Card.Text>
                    <a href={`/trip/${trip.id}`} className="btn btn-primary">View Trip</a>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Row className="my-4">
            <Col>
              <p className="text-center">No trips planned yet. Click "Plan A New Trip" to get started.</p>
            </Col>
          </Row>
        )}
      </Container>

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
    </>
  );
}

export default TripsPage;