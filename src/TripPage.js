import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Container, Row, Col, Card, Form, Button, Modal, CloseButton, Tabs, Tab, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { LoadScript, GoogleMap, Polyline, Marker, Autocomplete } from '@react-google-maps/api';
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
  const [eventType, setEventType] = useState('');

  const [collaborator, setCollaborator] = useState('');
  const [collaboratorsData, setCollaboratorsData] = useState([]);

  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editEventIndex, setEditEventIndex] = useState(null);

  const [showInvalidTimeAlert, setShowInvalidTimeAlert] = useState(false);

  const [travelMode, setTravelMode] = useState('DRIVING');

  useEffect(() => {
    const fetchAndInitializeTrip = async () => {
      const docRef = doc(db, 'trips', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;

      let tripData = { id: docSnap.id, ...docSnap.data() };

      if (!Array.isArray(tripData.days) || tripData.days.length === 0) {
        tripData = initializeTripDays(tripData);
        await updateDoc(docRef, tripData);
      }

      setTrip(tripData);
      setTravelMode(tripData.travelMode || 'DRIVING');
      await fetchCollaborators(tripData.collaborators || []);
    };

    fetchAndInitializeTrip();
  }, [id]);

  const initializeTripDays = (tripData) => {
    const start = new Date(tripData.startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(tripData.endDate);
    end.setUTCHours(0, 0, 0, 0);

    const days = [];
    for (let d = new Date(start); d <= end; ) {
      d.setUTCDate(d.getUTCDate() + 1);
      days.push({ date: d.toISOString().split('T')[0], events: [] });
    }
    return { ...tripData, days };
  };

  const fetchCollaborators = async (collabs) => {
    if (!collabs.length) {
      setCollaboratorsData([]);
      return;
    }
    const q = query(collection(db, 'users'), where('userid', 'in', collabs));
    const snap = await getDocs(q);
    setCollaboratorsData(snap.docs.map(d => d.data()));
  };

  const handleTime = (input, operation) => {
    if (operation === 'parse') {
      if (!input) return 0;
      const [h, m] = input.split(':').map(Number);
      return h * 60 + m;
    }

    if (operation === 'format') {
      const mins = ((input % 1440) + 1440) % 1440;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    if (operation === 'duration') {
      if (!input) return 0;

      if (typeof input === 'number') return Math.round(input / 60);

      if (typeof input === 'string' && input.startsWith('PT')) {
        const h = /(\d+)H/.exec(input);
        const m = /(\d+)M/.exec(input);
        return (parseInt(h?.[1] || 0, 10) * 60) + parseInt(m?.[1] || 0, 10);
      }

      if (typeof input === 'object' && input.seconds != null) {
        return Math.round(input.seconds / 60);
      }

      return 0;
    }

    return 0;
  };

  const handleAddCollaborator = async (e) => {
    e.preventDefault();

    let snap = await getDocs(query(collection(db, 'users'), where('displayName', '==', collaborator)));
    if (snap.empty) {
      snap = await getDocs(query(collection(db, 'users'), where('email', '==', collaborator)));
    }
    const userData = snap.docs[0].data();

    if (!trip.collaborators.includes(userData.userid)) {
      const updated = { ...trip, collaborators: [...trip.collaborators, userData.userid] };
      await updateTrip(updated);
      fetchCollaborators(updated.collaborators);
    }
    setCollaborator('');
  };

  const handleRemoveCollaborator = async (uid) => {
    const updated = { ...trip, collaborators: trip.collaborators.filter(c => c !== uid) };
    await updateTrip(updated);
    fetchCollaborators(updated.collaborators);
  };

  const handleLeaveTrip = async () => {
    const me = auth.currentUser.uid;
    const updated = { ...trip, collaborators: trip.collaborators.filter(c => c !== me) };
    await updateTrip(updated);
    navigate('/trips');
  };

  const isValidTimeRange = (start, end) => {
    const s = handleTime(start, 'parse');
    const e = handleTime(end, 'parse');
    if (s >= e) return false;

    const day = trip.days[selectedDayIndex];
    return !day.events.some(ev => {
      const es = handleTime(ev.startTime, 'parse');
      const ee = handleTime(ev.endTime, 'parse');
      return (s >= es && s < ee) || (e > es && e <= ee) || (s < es && e > ee);
    });
  };

  const isValidTimeRangeEdits = (start, end) => {
    const s = handleTime(start, 'parse');
    const e = handleTime(end, 'parse');
    if (s >= e) return false;

    const day = trip.days[selectedDayIndex];
    return !day.events.some((ev, idx) => {

      if (editEventIndex && editEventIndex.dayIdx === selectedDayIndex && editEventIndex.eventIdx === idx) {
        return false;
      }

      const es = handleTime(ev.startTime, 'parse');
      const ee = handleTime(ev.endTime, 'parse');
      return (s >= es && s < ee) || (e > es && e <= ee) || (s < es && e > ee);
    });
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!isValidTimeRange(eventStartTime, eventEndTime)){
      setShowInvalidTimeAlert(true);
      setTimeout(() => setShowInvalidTimeAlert(false), 2000);
      return;
    }
    if (!eventType) return;

    const newEv = {
      title: eventTitle,
      startTime: eventStartTime,
      endTime: eventEndTime,
      address: eventAddress,
      location: eventLocation,
      eventType: eventType
    };
    const days = [...trip.days];
    days[selectedDayIndex].events.push(newEv);
    const updated = { ...trip, days, travelMode };
    await updateTrip(updated);

    setEventTitle('');
    setEventStartTime('');
    setEventEndTime('');
    setEventAddress('');
    setEventLocation(null);
    setEventType('');
    setShowAddEventModal(false);
  };

  const handleRemoveEvent = async (dayIdx, evIdx) => {
    const days = [...trip.days];
    days[dayIdx].events.splice(evIdx, 1);
    days[dayIdx].optimizedRoute = false;
    days[dayIdx].travelOptions = null;
    await updateTrip({ ...trip, days });
  };

  const handleEditEvent = (dayIdx, eventIdx) => {
    const event = trip.days[dayIdx].events[eventIdx];
    setEditEventIndex({ dayIdx, eventIdx });
    setEventTitle(event.title);
    setEventStartTime(event.startTime);
    setEventEndTime(event.endTime);
    setEventAddress(event.address);
    setEventLocation(event.location);
    setEventType(event.eventType);
    setShowEditEventModal(true);
  };

  const handleSaveEditedEvent = async (e) => {
    e.preventDefault();
  
    const { dayIdx, eventIdx } = editEventIndex;
    const updatedEvent = {
      title: eventTitle,
      startTime: eventStartTime,
      endTime: eventEndTime,
      address: eventAddress,
      location: eventLocation,
      eventType: eventType,
    };


    if (!isValidTimeRangeEdits(updatedEvent.startTime, updatedEvent.endTime)) {
      setShowInvalidTimeAlert(true);
      setTimeout(() => setShowInvalidTimeAlert(false), 2000);
      return;
    }

  
    const days = [...trip.days];
    days[dayIdx].events[eventIdx] = updatedEvent;
  
    const updatedTrip = { ...trip, days };
    await updateTrip(updatedTrip);

    setShowEditEventModal(false);
    };


  const handleHideEditEvent = () => {
    setEventTitle('');
    setEventStartTime('');
    setEventEndTime('');
    setEventAddress('');
    setEventLocation(null);
    setEventType('');
    setShowEditEventModal(false);
  }

  const updateTrip = async (upd) => {
    await updateDoc(doc(db, 'trips', upd.id), upd);
    setTrip(upd);
  };

  const checkEventDistances = async (events) => {
    const distanceService = new window.google.maps.DistanceMatrixService();
    for (let i = 0; i < events.length - 1; i++) {
      const result = await new Promise(resolve => {
        distanceService.getDistanceMatrix(
          {
            origins: [{ lat: events[i].location.lat, lng: events[i].location.lng }],
            destinations: [{ lat: events[i + 1].location.lat, lng: events[i + 1].location.lng }],
            travelMode: window.google.maps.TravelMode[travelMode]
          },
          (response, status) => resolve({ response, status })
        );
      });
      if (result.status === 'OK' && result.response.rows[0].elements[0].distance.value / 1000 > 500) {
        return false;
      }
    }
    return true;
  };

  const getTravelOptions = (origin, destination, idx, events) => {
    const svc = new window.google.maps.DirectionsService();
    return new Promise(resolve => {
      svc.route(
        { origin, destination, travelMode: window.google.maps.TravelMode[travelMode] },
        (result, status) => {
          if (status === 'OK') {
            const leg = result.routes[0].legs[0];
            const travelDurationMin = Math.round(leg.duration.value / 60);
            const nextEventStart = handleTime(events[idx + 1].startTime, 'parse');
            const leaveByMin = nextEventStart - travelDurationMin;
            const leaveByMinLower = leaveByMin - 5;
            const leaveByMinUpper = leaveByMin + 5;
            if (travelMode === 'DRIVING') {
              resolve({
                segment: idx,
                mode: 'DRIVING',
                duration: leg.duration.text,
                instructions: `Drive to ${destination}`,
                leaveBy: `${handleTime(leaveByMinLower, 'format')} - ${handleTime(leaveByMinUpper, 'format')}`
              });
            } else {
              const steps = leg.steps.map(s => ({
                mode: s.travel_mode,
                duration: s.duration.text,
                instructions: s.instructions.replace(/<[^>]+>/g, '')
              }));
              resolve({
                segment: idx,
                steps,
                leaveBy: `${handleTime(leaveByMinLower, 'format')} - ${handleTime(leaveByMinUpper, 'format')}`
              });
            }
          } else {
            resolve({
              segment: idx,
              mode: travelMode,
              duration: 'N/A',
              instructions: 'Route unavailable',
              leaveBy: 'N/A'
            });
          }
        }
      );
    });
  };

  const optimizeRoute = async (events) => {
    if (!(await checkEventDistances(events))) return { optimizedEvents: events, travelOptions: [] };

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'routes.optimizedIntermediateWaypointIndex,routes.legs.duration'
      },
      body: JSON.stringify({
        origin: { address: events[0].address },
        destination: { address: events.at(-1).address },
        intermediates: events.slice(1, -1).map(ev => ({ address: ev.address })),
        travelMode: travelMode === 'DRIVING' ? 'DRIVE' : 'TRANSIT',
        optimizeWaypointOrder: true
      })
    });
    const data = await response.json();
    const rawOrder = data.routes?.[0]?.optimizedIntermediateWaypointIndex || [];

    const intermediates = events.slice(1, -1);
    const safeOrder = rawOrder.filter(idx => idx >= 0 && idx < intermediates.length);
    const orderedIntermediates = safeOrder.length ? safeOrder.map(i => intermediates[i]) : intermediates;
    const optimizedEvents = [events[0], ...orderedIntermediates, events.at(-1)].filter(Boolean);

    const travelOptions = await Promise.all(
      optimizedEvents.slice(0, -1).map((ev, idx) =>
        getTravelOptions(ev.address, optimizedEvents[idx + 1].address, idx, optimizedEvents)
      )
    );

    return { optimizedEvents, travelOptions };
  };

  const handleOptimizeDay = async (dayIdx) => {
    const day = trip.days[dayIdx];
    if (day.events.length < 3) return alert('Need at least 3 events to optimize.');
    const { optimizedEvents, travelOptions } = await optimizeRoute(day.events);
    const days = [...trip.days];
    days[dayIdx].events = optimizedEvents;
    days[dayIdx].optimizedRoute = true;
    days[dayIdx].travelOptions = travelOptions;
    await updateTrip({ ...trip, days });
  };

  const renderDayCard = (day, dayIdx) => (
    <Col md={4} key={day.date}>
      <Card>
        <Card.Body>
          <h3>{new Date(day.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}</h3>
          {day.events.map((ev, i) => (
            <div key={i} className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <h4>{ev.title}</h4>
                <p>{ev.startTime}–{ev.endTime}</p>
                <p>{ev.address}</p>
                <p>Type: {ev.eventType}</p>
              </div>
              <Button
                size="sm"
                variant="outline-primary"
                style={{ marginLeft: '10px', marginRight: '10px' }}
                onClick={() => {setSelectedDayIndex(dayIdx); handleEditEvent(dayIdx, i)}}
              >
                Edit
              </Button>
              <CloseButton onClick={() => handleRemoveEvent(dayIdx, i)} />
            </div>
          ))}
          <Button size="sm" className="me-2" onClick={() => { setSelectedDayIndex(dayIdx); setShowAddEventModal(true); }}>
            Add Event
          </Button>
          <div style={{ display: 'inline-block' }}>
            {day.events.length < 3 ? (
              <OverlayTrigger
                placement="top"
                overlay={
                  <Tooltip>
                    You need at least 3 events before optimizing the Trip
                  </Tooltip>
                }
              >
                <span>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled
                    style={{ pointerEvents: 'none' }}
                  >
                    Optimize Route
                  </Button>
                </span>
              </OverlayTrigger>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleOptimizeDay(dayIdx)}
              >
                Optimize Route
              </Button>
            )}
          </div>
          {day.optimizedRoute && (
            <>
              <h4>Optimized Route</h4>
              <GoogleMap mapContainerStyle={{ height: '200px', width: '100%' }} center={day.events[0]?.location} zoom={10}>
                {day.events.map((ev, i) => (
                  <Marker key={i} position={ev.location} label={ev.title} />
                ))}
                <Polyline path={day.events.map(ev => ev.location)} />
              </GoogleMap>
              {day.travelOptions?.map((opt, i) => (
                <div key={i} className="mt-2">
                  <h5>Leg {i + 1}: {opt.mode || 'TRANSIT'} – {opt.duration}</h5>
                  <p>{opt.instructions || (opt.steps && opt.steps.map((s, j) => (
                    <span key={j}>{s.instructions} ({s.duration})<br/></span>
                  )))}</p>
                  <p>Leave by {opt.leaveBy}</p>
                </div>
              ))}
            </>
          )}
        </Card.Body>
      </Card>
    </Col>
  );

  if (!trip) return <p>Loading trip details…</p>;

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
                  <h1>Your Trip to {trip.name}</h1>
                  <h2>
                    {new Date(trip.startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })} –
                    {new Date(trip.endDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
                  </h2>
                </Col>
              </Row>
              <Row className="g-4">
                {trip.days.map((day, idx) => renderDayCard(day, idx))}
              </Row>
            </Container>
          </main>
        </div>
        <Modal show={showAddEventModal} onHide={() => setShowAddEventModal(false)} dialogClassName="modal-autocomplete">
          <Modal.Header closeButton>
            <h2>Add Event for {trip.days[selectedDayIndex]?.date}</h2>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleAddEvent}>
              <Form.Group className="mb-3">
                <Form.Label>Title</Form.Label>
                <Form.Control type="text" value={eventTitle} onChange={e => setEventTitle(e.target.value)} required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Event Type</Form.Label>
                <Form.Select value={eventType} onChange={e => setEventType(e.target.value)} required>
                  <option value="">Select event type</option>
                  <option value="Food">Food</option>
                  <option value="Concert">Concert</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Activity">Activity</option>
                  <option value="Museum">Museum</option>
                  <option value="Park">Park</option>
                  <option value="Nightlife">Nightlife</option>
                  <option value="Sightseeing">Sightseeing</option>
                  <option value="Sports">Sports</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Other">Other</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Start Time</Form.Label>
                <Form.Control type="time" value={eventStartTime} onChange={e => setEventStartTime(e.target.value)} required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>End Time</Form.Label>
                <Form.Control type="time" value={eventEndTime} onChange={e => setEventEndTime(e.target.value)} required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Address</Form.Label>
                <PlacesAutocomplete value={eventAddress} setValue={setEventAddress} setLocation={setEventLocation} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Travel Mode</Form.Label>
                <Form.Select value={travelMode} onChange={e => setTravelMode(e.target.value)}>
                  <option value="DRIVING">Driving</option>
                  <option value="TRANSIT">Public Transit</option>
                </Form.Select>
              </Form.Group>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {showInvalidTimeAlert && (
                  <div
                    style={{  
                      position: 'absolute',
                      bottom: '100%',
                      backgroundColor: '#f8d7da',
                      color: '#721c24',
                      padding: '10px',
                      borderRadius: '5px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Invalid Time.
                  </div>
                )}
                  <Button type="submit">Save Event</Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>
        <Modal show={showPreferencesModal} onHide={() => setShowPreferencesModal(false)}>
          <Modal.Header closeButton>
            <h2>Trip Preferences</h2>
          </Modal.Header>
          <Modal.Body>
            <Tabs defaultActiveKey="collaborators" id="preferences-tabs">
              <Tab eventKey="collaborators" title="Collaborators">
                {collaboratorsData.map(c => (
                  <div key={c.userid} className="d-flex justify-content-between align-items-center mb-2">
                    <span>{c.displayName}</span>
                    {trip.userID === auth.currentUser.uid && (
                      <CloseButton onClick={() => handleRemoveCollaborator(c.userid)} />
                    )}
                  </div>
                ))}
                {trip.userID === auth.currentUser.uid && (
                  <Form onSubmit={handleAddCollaborator} className="mt-3">
                    <Form.Control
                      type="text"
                      placeholder="Username or email"
                      value={collaborator}
                      onChange={e => setCollaborator(e.target.value)}
                      required
                    />
                    <Button className="mt-2" type="submit">Add</Button>
                  </Form>
                )}
              </Tab>
            </Tabs>
          </Modal.Body>
          <Modal.Footer>
            {collaboratorsData.some(c => c.userid === auth.currentUser.uid) && (
              <Button variant="danger" onClick={handleLeaveTrip}>Leave Trip</Button>
            )}
            <Button onClick={() => setShowPreferencesModal(false)}>Close</Button>
          </Modal.Footer>
        </Modal>
        <Modal show={showEditEventModal} onHide={() => handleHideEditEvent()}>
          <Modal.Header closeButton>
            <Modal.Title>Edit Event</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleSaveEditedEvent}>
              <Form.Group className="mb-3">
                <Form.Label>Title</Form.Label>
                <Form.Control
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Start Time</Form.Label>
                <Form.Control
                  type="time"
                  value={eventStartTime}
                  onChange={(e) => setEventStartTime(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>End Time</Form.Label>
                <Form.Control
                  type="time"
                  value={eventEndTime}
                  onChange={(e) => setEventEndTime(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Address</Form.Label>
                <PlacesAutocomplete
                  value={eventAddress}
                  setValue={setEventAddress}
                  setLocation={setEventLocation}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Event Type</Form.Label>
                <Form.Select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  required
                >
                  <option value="">Select event type</option>
                  <option value="Food">Food</option>
                  <option value="Concert">Concert</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Activity">Activity</option>
                  <option value="Museum">Museum</option>
                  <option value="Park">Park</option>
                  <option value="Nightlife">Nightlife</option>
                  <option value="Sightseeing">Sightseeing</option>
                  <option value="Sports">Sports</option>
                  <option value="Workshop">Workshop</option>
                  <option value="Other">Other</option>
                </Form.Select>
              </Form.Group>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {showInvalidTimeAlert && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      backgroundColor: '#f8d7da',
                      color: '#721c24',
                      padding: '10px',
                      borderRadius: '5px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Invalid Time.
                  </div>
                )}
                <Button type="submit" variant="primary">
                  Save Changes
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>
      </div>
    </LoadScript>
  );
}

function PlacesAutocomplete({ value, setValue, setLocation }) {
  const autoRef = useRef(null);

  return (
    <Autocomplete
      onLoad={ref => (autoRef.current = ref)}
      onPlaceChanged={() => {
        const place = autoRef.current.getPlace();
        setValue(place.formatted_address);
        setLocation({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        });
      }}
    >
      <Form.Control type="text" placeholder="Enter place or address" value={value} onChange={e => setValue(e.target.value)} required />
    </Autocomplete>
  );
}

export default TripPage;