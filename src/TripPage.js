import React, { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import './index.css';

function TripPage() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);

  useEffect(() => {
    const fetchTrip = async () => {
      const docRef = doc(db, "trips", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setTrip({ id: docSnap.id, ...docSnap.data() });
      } else {
        console.log("No such document!");
      }
    };
    fetchTrip();
  }, [id]);

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
            {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
          </h4>
        </Col>
      </Row>
      <Row className="g-3">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>Flights</Card.Title>
              <Card.Text>Flight placeholder</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>Hotels</Card.Title>
              <Card.Text>Hotel placeholder</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>Activities/Food</Card.Title>
              <Card.Text>Activity placeholder</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <Card.Title>Transportation</Card.Title>
              <Card.Text>Transportation placeholder</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default TripPage;