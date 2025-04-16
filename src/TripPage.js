import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Container, Row, Col, Card, Form, Button, Modal, CloseButton, Tabs, Tab } from 'react-bootstrap';
import { LoadScript, GoogleMap, Polyline, Marker, StandaloneSearchBox } from '@react-google-maps/api';
import './index.css';

const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const LIBRARIES = ['places'];

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
  const [eventAddress, setEventAddress] = useState('');
  const [eventLocation, setEventLocation] = useState(null);
  const [collaborator, setCollaborator] = useState('');
  const [collaboratorsData, setCollaboratorsData] = useState([]);
  const [travelMode, setTravelMode] = useState('DRIVING');
  const searchBoxRef = useRef(null);

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
        setTravelMode(tripData.travelMode || 'DRIVING');
        await fetchCollaborators(tripData.collaborators || []);
      }
    };
    fetchAndInitializeTrip();
  }, [id]);

  const initializeTripDays = (tripData) => {
    const { startDate, endDate } = tripData;
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(0, 0, 0, 0);

    let daysArray = [];
    for (let d = new Date(start); d.getTime() <= end.getTime();) {
      daysArray.push({
        date: new Date(d).toISOString().split('T')[0],
        events: []
      });
      d.setUTCDate(d.getUTCDate() + 1);
    }
    tripData.days = daysArray;
    return tripData;
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
    const results = collaboratorsSnapshot.docs.map(doc => doc.data());
    setCollaboratorsData(results);
  };

  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    let usersSnapshot;

    const usersQuery = query(
      collection(db, 'users'),
      where('displayName', '==', collaborator)
    );
    usersSnapshot = await getDocs(usersQuery);

    if (usersSnapshot.empty) {
      const usersEmailQuery = query(
        collection(db, 'users'),
        where('email', '==', collaborator)
      );
      usersSnapshot = await getDocs(usersEmailQuery);

      if (usersSnapshot.empty) {
        alert('No user found by username or email!');
        return;
      }
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    if (trip.collaborators.includes(userData.userid)) {
      alert('User is already a collaborator!');
      return;
    }

    const updatedCollabs = [...trip.collaborators, userData.userid];
    const updatedTrip = { ...trip, collaborators: updatedCollabs };
    await updateTrip(updatedTrip);
    setCollaborator('');
    fetchCollaborators(updatedTrip.collaborators);
  };

  const handleRemoveCollaborator = async (uid) => {
    const updatedCollabs = trip.collaborators.filter(collab => collab !== uid);
    const updatedTrip = { ...trip, collaborators: updatedCollabs };
    await updateTrip(updatedTrip);
    fetchCollaborators(updatedTrip.collaborators);
  };

  const handleLeaveTrip = async () => {
    const user = auth.currentUser.uid;
    const updatedCollabs = trip.collaborators.filter(collab => collab !== user);
    const updatedTrip = { ...trip, collaborators: updatedCollabs };
    await updateTrip(updatedTrip);
    navigate('/trips');
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!isValidTimeRange(eventStartTime, eventEndTime)) {
      alert('Invalid time range or overlapping events.');
      return;
    }

    const newEvent = {
      title: eventTitle,
      startTime: eventStartTime,
      endTime: eventEndTime,
      address: eventAddress,
      location: eventLocation
    };

    const updatedDays = [...trip.days];
    updatedDays[selectedDayIndex].events.push(newEvent);
    const updatedTrip = { ...trip, days: updatedDays, travelMode };
    await updateTrip(updatedTrip);

    setEventTitle('');
    setEventStartTime('');
    setEventEndTime('');
    setEventAddress('');
    setEventLocation(null);
    setShowAddEventModal(false);
  };

  const handleRemoveEvent = async (dayIndex, eventIndex) => {
    const updatedDays = [...trip.days];
    updatedDays[dayIndex].events.splice(eventIndex, 1);
    updatedDays[dayIndex].optimizedRoute = null;
    updatedDays[dayIndex].travelOptions = null;
    await updateTrip({ ...trip, days: updatedDays });
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
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime = (minutes) => {
    minutes = Math.round(minutes) % 1440;
    if (minutes < 0) minutes += 1440;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const updateTrip = async (updatedTrip) => {
    const docRef = doc(db, 'trips', updatedTrip.id);
    await updateDoc(docRef, updatedTrip);
    setTrip(updatedTrip);
  };

  const handleOptimizeDay = async (dayIndex) => {
    const day = trip.days[dayIndex];
    if (day.events.length < 2) {
      alert('Need at least two events with addresses to optimize.');
      return;
    }

    if (!day.events.every(event => event.address && event.location)) {
      alert('All events must have valid addresses.');
      return;
    }

    try {
      const { optimizedEvents, travelOptions } = await optimizeRoute(day.events);
      const updatedDays = [...trip.days];
      updatedDays[dayIndex].events = optimizedEvents;
      updatedDays[dayIndex].optimizedRoute = true;
      updatedDays[dayIndex].travelOptions = travelOptions;
      await updateTrip({ ...trip, days: updatedDays });
    } catch (error) {
      console.error('Optimization error:', error);
      alert('Failed to optimize route. Please try again.');
    }
  };

  const optimizeRoute = async (events) => {
    const origin = events[0].address;
    const intermediates = events.slice(1).map(event => ({ address: event.address }));

    
    const maxDistance = 500; 
    const locations = events.filter(e => e.location).map(e => e.location);
    for (let i = 0; i < locations.length - 1; i++) {
      const dist = haversineDistance(locations[i], locations[i + 1]);
    }

    const response = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'routes.optimizedIntermediateWaypointIndex,routes.legs'
        },
        body: JSON.stringify({
          origin: { address: origin },
          destination: { address: origin },
          intermediates,
          travelMode: 'DRIVE',
          optimizeWaypointOrder: true
        })
      }
    );

    const data = await response.json();
    if (!data.routes || !data.routes[0].optimizedIntermediateWaypointIndex) {
      throw new Error('No optimized route found.');
    }

    const optimizedOrder = data.routes[0].optimizedIntermediateWaypointIndex;
    const optimizedEvents = [events[0]];
    optimizedOrder.forEach(idx => optimizedEvents.push(events[idx + 1]));

    let currentTime = parseTime(events[0].startTime);
    for (let i = 0; i < optimizedEvents.length; i++) {
      const event = optimizedEvents[i];
      const eventDuration = parseTime(event.endTime) - parseTime(event.startTime);
      const travelDuration = i < data.routes[0].legs.length ? Math.round(parseInt(data.routes[0].legs[i].duration) / 60) : 0;

      if (i < optimizedEvents.length - 1) {
        
        const nextEvent = optimizedEvents[i + 1];
        const nextStartTime = parseTime(nextEvent.startTime);
        const gap = nextStartTime - (currentTime + eventDuration + travelDuration);
        const buffer = gap > 0 ? Math.round(gap / 2) : 0; 

        optimizedEvents[i] = {
          ...event,
          startTime: formatTime(currentTime),
          endTime: formatTime(currentTime + eventDuration),
          bufferAfter: buffer
        };
        optimizedEvents[i + 1] = {
          ...nextEvent,
          bufferBefore: buffer
        };
        currentTime += eventDuration + travelDuration + gap;
      } else {
        optimizedEvents[i] = {
          ...event,
          startTime: formatTime(currentTime),
          endTime: formatTime(currentTime + eventDuration),
          bufferAfter: 0
        };
        currentTime += eventDuration;
      }
    }

    const travelOptions = [];
    for (let i = 0; i < optimizedEvents.length - 1; i++) {
      const travel = await getTravelOptions(
        optimizedEvents[i].address,
        optimizedEvents[i + 1].address,
        i,
        optimizedEvents
      );
      travelOptions.push(travel);
    }

    return { optimizedEvents, travelOptions };
  };

  const haversineDistance = (loc1, loc2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371; 
    const dLat = toRad(loc2.lat - loc1.lat);
    const dLon = toRad(loc2.lng - loc1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(loc1.lat)) * Math.cos(toRad(loc2.lat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getTravelOptions = async (origin, destination, index, optimizedEvents) => {
    const directionsService = new window.google.maps.DirectionsService();
    return new Promise((resolve) => {
      directionsService.route(
        {
          origin,
          destination,
          travelMode: window.google.maps.TravelMode[travelMode]
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            if (travelMode === 'DRIVING') {
              const leg = result.routes[0].legs[0];
              const option = {
                segment: index,
                mode: 'DRIVING',
                duration: leg.duration.text,
                instructions: `Drive to ${destination}`,
                leaveAt: formatTime(parseTime(optimizedEvents[index].endTime) + (optimizedEvents[index].bufferAfter || 0))
              };
              resolve(option);
            } else {
              const steps = result.routes[0].legs[0].steps.reduce((acc, step, idx) => {
                acc[`step${idx}`] = {
                  mode: step.travel_mode,
                  duration: step.duration.text,
                  instructions: step.instructions.replace(/<[^>]+>/g, '')
                };
                return acc;
              }, {});
              resolve({
                segment: index,
                steps,
                leaveAt: formatTime(parseTime(optimizedEvents[index].endTime) + (optimizedEvents[index].bufferAfter || 0))
              });
            }
          } else {
            console.error('Directions request failed:', status);
            resolve(travelMode === 'DRIVING' ? {
              segment: index,
              mode: 'DRIVING',
              duration: 'N/A',
              instructions: 'Route unavailable',
              leaveAt: optimizedEvents[index].endTime 
            } : {
              segment: index,
              steps: {},
              leaveAt: optimizedEvents[index].endTime
            });
          }
        }
      );
    });
  };

  const renderDayCard = (day, dayIndex) => (
    <Col md={4} key={day.date}>
      <Card className="trip-card position-relative">
        <Card.Body>
          <Card.Title className="text-teal fw-bold fs-5">
            {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit'
            })}
          </Card.Title>
          {day.events.map((event, eventIndex) => (
            <div key={eventIndex} className="d-flex justify-content-between align-items-center mb-2">
              <p className="mb-0">
                <strong>{event.title}</strong> <br />
                <span className="text-muted">
                  {event.startTime} - {event.endTime} <br />
                  {event.address} <br />
                  {event.bufferBefore > 0 && `Buffer before: ${Math.round(event.bufferBefore)} mins`} <br />
                  {event.bufferAfter > 0 && `Buffer after: ${Math.round(event.bufferAfter)} mins`}
                </span>
              </p>
              <CloseButton onClick={() => handleRemoveEvent(dayIndex, eventIndex)} />
            </div>
          ))}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSelectedDayIndex(dayIndex);
              setShowAddEventModal(true);
            }}
            className="me-2"
          >
            Add Event
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOptimizeDay(dayIndex)}
            disabled={day.events.length < 2}
          >
            Optimize Route
          </Button>
          {day.optimizedRoute && (
            <div className="mt-3">
              <h6>Optimized Route</h6>
              <GoogleMap
                mapContainerStyle={{ height: '200px', width: '100%' }}
                center={day.events[0]?.location || { lat: 0, lng: 0 }}
                zoom={10}
              >
                {day.events.map((event, idx) => (
                  <Marker key={idx} position={event.location} label={event.title} />
                ))}
                <Polyline
                  path={day.events.map(event => event.location)}
                  options={{ strokeColor: '#FF0000' }}
                />
              </GoogleMap>
              {day.travelOptions && (
                <>
                  <h6 className="mt-3">Travel Options</h6>
                  {day.travelOptions.map((option, idx) => (
                    <div key={idx} className="mb-2">
                      <strong>From {day.events[idx].title} to {day.events[idx + 1].title}</strong>
                      {option.mode === 'DRIVING' ? (
                        <p className="mb-1">
                          {option.mode}: {option.duration} - {option.instructions} <br />
                          Leave at: {option.leaveAt}
                        </p>
                      ) : (
                        Object.values(option.steps).map((step, stepIdx) => (
                          <p key={stepIdx} className="mb-1">
                            {step.mode}: {step.duration} - {step.instructions}
                          </p>
                        ))
                      )}
                      {option.mode !== 'DRIVING' && <p className="mb-1">Leave at: {option.leaveAt}</p>}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </Col>
  );

  if (!trip) {
    return <p>Loading trip details...</p>;
  }

  return (
    <LoadScript googleMapsApiKey={GOOGLE_API_KEY} libraries={LIBRARIES}>
      <div className="dashboard-container">
        <aside className="dashboard-sidebar">
          <h2>Trip Dashboard</h2>
          <Link to="/trips" className="nav-link">Your Trips</Link>
          <Link to="#" className="nav-link">Trip Details</Link>
        </aside>

        <div className="dashboard-main">
          <header className="dashboard-header">
            <Link to="/trips" className="btn btn-outline-primary">Back to Trips</Link>
            <Button variant="outline-secondary" onClick={() => setShowPreferencesModal(true)}>
              Preferences
            </Button>
          </header>

          <main className="dashboard-content">
            <Container className="my-5">
              <Row className="mb-4">
                <Col>
                  <h1 className="text-center">Your Trip to {trip.name}</h1>
                  <h4 className="text-center">
                    {new Date(trip.startDate).toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit'
                    })} - 
                    {new Date(trip.endDate).toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit'
                    })}
                  </h4>
                </Col>
              </Row>

              <Row className="g-4">
                {trip.days.map((day, dayIndex) => renderDayCard(day, dayIndex))}
              </Row>
            </Container>
          </main>
        </div>

        <Modal show={showAddEventModal} onHide={() => setShowAddEventModal(false)} dialogClassName="modal-autocomplete">
          <Modal.Header closeButton>
            <Modal.Title>Add Event for {trip.days[selectedDayIndex]?.date}</Modal.Title>
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
              <Form.Group className="mb-3" controlId="formEventAddress">
                <Form.Label>Address</Form.Label>
                <div className="autocomplete-wrapper">
                  <PlacesAutocomplete
                    value={eventAddress}
                    setValue={setEventAddress}
                    setLocation={setEventLocation}
                    searchBoxRef={searchBoxRef}
                    className="autocomplete-input"
                  />
                </div>
              </Form.Group>
              <Form.Group className="mb-3" controlId="formTravelMode">
                <Form.Label>Travel Mode</Form.Label>
                <Form.Select
                  value={travelMode}
                  onChange={(e) => setTravelMode(e.target.value)}
                >
                  <option value="DRIVING">Driving</option>
                  <option value="TRANSIT">Public Transit</option>
                </Form.Select>
              </Form.Group>
              <Button variant="primary" type="submit">
                Save Event
              </Button>
            </Form>
          </Modal.Body>
        </Modal>

        <Modal show={showPreferencesModal} onHide={() => setShowPreferencesModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Trip Preferences</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Tabs defaultActiveKey="collaborators" id="preferences-tabs">
              <Tab eventKey="collaborators" title="Collaborators">
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
                    <Button variant="primary" type="submit">
                      Add
                    </Button>
                  </Form>
                )}
              </Tab>
            </Tabs>
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
    </LoadScript>
  );
}

function PlacesAutocomplete({ value, setValue, setLocation, searchBoxRef, className }) {
  const onPlacesChanged = () => {
    const places = searchBoxRef.current.getPlaces();
    if (places && places.length > 0) {
      const place = places[0];
      setValue(place.formatted_address);
      setLocation({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      });
    }
  };

  return (
    <StandaloneSearchBox
      onLoad={(ref) => (searchBoxRef.current = ref)}
      onPlacesChanged={onPlacesChanged}
      bounds={{
        north: 28.7015,
        south: 28.3472,
        east: -81.1947,
        west: -81.7062
      }} 
    >
      <Form.Control
        type="text"
        placeholder="Enter place or address (e.g. Pizza Hut)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={className}
        required
      />
    </StandaloneSearchBox>
  );
}

export default TripPage;