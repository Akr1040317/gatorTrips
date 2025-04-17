import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db, auth } from './firebase';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Modal,
  CloseButton,
  Tabs,
  Tab
} from 'react-bootstrap';
import {
  LoadScript,
  GoogleMap,
  Polyline,
  Marker,
  Autocomplete
} from '@react-google-maps/api';
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
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      days.push({ date: d.toISOString().split('T')[0], events: [] });
    }
    return { ...tripData, days };
  };

  const fetchCollaborators = async (collabs) => {
    if (!collabs?.length) { setCollaboratorsData([]); return; }
    const q = query(collection(db, 'users'), where('userid', 'in', collabs));
    const snap = await getDocs(q);
    setCollaboratorsData(snap.docs.map(d => d.data()));
  };

  const parseTime = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const formatTime = (mins) => {
    if (!Number.isFinite(mins)) return 'NaN:NaN';
    mins = ((mins % 1440) + 1440) % 1440;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const durationToMinutes = (raw) => {
    if (!raw) return 0;

    if (typeof raw === 'number') return Math.round(raw / 60);

    if (typeof raw === 'string' && /^\d+s$/.test(raw.trim())) {
      const sec = parseInt(raw.trim().replace('s', ''), 10);
      return Math.round(sec / 60);
    }

    if (typeof raw === 'string' && raw.startsWith('PT')) {
      const h = /(\d+)H/.exec(raw);
      const m = /(\d+)M/.exec(raw);
      return (parseInt(h?.[1] || 0, 10) * 60) + parseInt(m?.[1] || 0, 10);
    }

    if (typeof raw === 'object' && raw.seconds != null) {
      return Math.round(raw.seconds / 60);
    }

    return 0;
  };

  const handleAddCollaborator = async (e) => {
    e.preventDefault();

    let snap = await getDocs(
      query(collection(db, 'users'), where('displayName', '==', collaborator))
    );
    if (snap.empty) {
      snap = await getDocs(
        query(collection(db, 'users'), where('email', '==', collaborator))
      );
      if (snap.empty) return alert('No user found!');
    }
    const userData = snap.docs[0].data();

    if (trip.collaborators.includes(userData.userid)) {
      return alert('Already a collaborator');
    }

    const updated = { ...trip, collaborators: [...trip.collaborators, userData.userid] };
    await updateTrip(updated);
    setCollaborator('');
    fetchCollaborators(updated.collaborators);
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
    const s = parseTime(start);
    const e = parseTime(end);
    if (s >= e) return false;

    const day = trip.days[selectedDayIndex];
    for (let ev of day.events) {
      const es = parseTime(ev.startTime);
      const ee = parseTime(ev.endTime);
      if ((s >= es && s < ee) || (e > es && e <= ee) || (s < es && e > ee)) return false;
    }
    return true;
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!isValidTimeRange(eventStartTime, eventEndTime)) {
      return alert('Invalid or overlapping times');
    }
    if (!eventType) {
      return alert('Please select an event type');
    }
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

  const updateTrip = async (upd) => {
    await updateDoc(doc(db, 'trips', upd.id), upd);
    setTrip(upd);
  };

  const haversineDistance = (a, b) => {
    const toRad = x => (x * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const c = 2 * Math.atan2(
      Math.sqrt(sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng),
      Math.sqrt(1 - (sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng))
    );
    return R * c;
  };

  const getTravelOptions = (origin, destination, idx, events) => {
    const svc = new window.google.maps.DirectionsService();
    return new Promise(resolve => {
      svc.route(
        { origin, destination, travelMode: window.google.maps.TravelMode[travelMode] },
        (result, status) => {
          if (status === 'OK') {
            const leg = result.routes[0].legs[0];
            if (travelMode === 'DRIVING') {
              resolve({
                segment: idx,
                mode: 'DRIVING',
                duration: leg.duration.text,
                instructions: `Drive to ${destination}`,
                leaveAt: formatTime(parseTime(events[idx].endTime) + (events[idx].bufferAfter || 0))
              });
            } else {
              const steps = leg.steps.map((s) => ({
                mode: s.travel_mode,
                duration: s.duration.text,
                instructions: s.instructions.replace(/<[^>]+>/g, '')
              }));
              resolve({
                segment: idx,
                steps,
                leaveAt: formatTime(parseTime(events[idx].endTime) + (events[idx].bufferAfter || 0))
              });
            }
          } else {
            console.error('DirectionsStatus', status);
            resolve({
              segment: idx,
              mode: travelMode,
              duration: 'N/A',
              instructions: 'Route unavailable',
              leaveAt: events[idx].endTime
            });
          }
        }
      );
    });
  };

  const optimizeRoute = async (events) => {
    for (let i = 0; i < events.length - 1; i++) {
      if (haversineDistance(events[i].location, events[i + 1].location) > 500) {
        alert('Some events are > 500 km apart'); throw new Error('Too far apart');
      }
    }

    const response = await fetch(
      'https://routes.googleapis.com/directions/v2:computeRoutes',
      {
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
          travelMode: 'DRIVE',
          optimizeWaypointOrder: true
        })
      }
    );
    const data = await response.json();
    const legs = data.routes?.[0]?.legs || [];
    const rawOrder = data.routes?.[0]?.optimizedIntermediateWaypointIndex || [];

    const intermediates = events.slice(1, -1);
    const safeOrder = rawOrder.filter(idx => idx >= 0 && idx < intermediates.length);
    const orderedIntermediates = safeOrder.length ? safeOrder.map(i => intermediates[i]) : intermediates;
    const optimizedEvents = [events[0], ...orderedIntermediates, events.at(-1)].filter(Boolean);

    let currentTime = parseTime(optimizedEvents[0].startTime);

    for (let i = 0; i < optimizedEvents.length; i++) {
      const ev = optimizedEvents[i];
      const durEvent = parseTime(ev.endTime) - parseTime(ev.startTime);
      const travelMin = i < legs.length ? durationToMinutes(legs[i].duration) : 0;

      optimizedEvents[i] = {
        ...ev,
        startTime: formatTime(currentTime),
        endTime: formatTime(currentTime + durEvent),
        bufferAfter: i < optimizedEvents.length - 1
          ? Math.max(0,
              parseTime(optimizedEvents[i + 1].startTime) - (currentTime + durEvent + travelMin)
            )
          : 0
      };

      currentTime += durEvent + travelMin;
      if (!Number.isFinite(currentTime) || currentTime > 1440) {
        alert('Schedule exceeds 24 h; split into multiple days.'); throw new Error('Day overflow');
      }
    }

    const travelOptions = await Promise.all(
      optimizedEvents.slice(0, -1).map((ev, idx) =>
        getTravelOptions(ev.address, optimizedEvents[idx + 1].address, idx, optimizedEvents)
      )
    );

    return { optimizedEvents, travelOptions };
  };

  const handleOptimizeDay = async (dayIdx) => {
    const day = trip.days[dayIdx];
    if (day.events.length < 3) return alert('Need ≥3 events to optimise.');
    if (!day.events.every(ev => ev.address && ev.location)) {
      return alert('Every event needs a valid address');
    }
    try {
      const { optimizedEvents, travelOptions } = await optimizeRoute(day.events);
      const days = [...trip.days];
      days[dayIdx].events = optimizedEvents;
      days[dayIdx].optimizedRoute = true;
      days[dayIdx].travelOptions = travelOptions;
      await updateTrip({ ...trip, days });
    } catch (err) {
      console.error('Optimization error:', err);
    }
  };

  const renderDayCard = (day, dayIdx) => (
    <Col md={4} key={day.date}>
      <Card className="trip-card position-relative">
        <Card.Body>
          <Card.Title className="fs-5 fw-bold text-teal">
            {new Date(day.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
          </Card.Title>

          {day.events.map((ev, i) => (
            <div key={i} className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <strong>{ev.title}</strong><br/>
                <small>{ev.startTime}–{ev.endTime}</small><br/>
                <small>{ev.address}</small><br/>
                <small>Type: {ev.eventType}</small><br/>
                {ev.bufferBefore > 0 && <small>Buffer before: {ev.bufferBefore} min</small>}<br/>
                {ev.bufferAfter > 0 && <small>Buffer after: {ev.bufferAfter} min</small>}
              </div>
              <CloseButton onClick={() => handleRemoveEvent(dayIdx, i)} />
            </div>
          ))}

          <Button
            size="sm"
            className="me-2"
            onClick={() => { setSelectedDayIndex(dayIdx); setShowAddEventModal(true); }}
          >
            Add Event
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={day.events.length < 3}
            onClick={() => handleOptimizeDay(dayIdx)}
          >
            Optimize Route
          </Button>

          {day.optimizedRoute && (
            <>
              <h6 className="mt-3">Optimized Route</h6>
              <GoogleMap
                mapContainerStyle={{ height: '200px', width: '100%' }}
                center={day.events[0]?.location}
                zoom={10}
              >
                {day.events.map((ev, i) => (
                  <Marker key={i} position={ev.location} label={ev.title} />
                ))}
                <Polyline path={day.events.map(ev => ev.location)} />
              </GoogleMap>

              {day.travelOptions?.map((opt, i) => (
                <div key={i} className="mt-2">
                  <strong>Leg {i + 1}:</strong> {opt.mode || 'TRANSIT'} – {opt.duration}<br/>
                  {opt.instructions || (opt.steps && opt.steps.map((s, j) => (
                    <span key={j}>{s.instructions} ({s.duration})<br/></span>
                  )))}<br/>
                  <small>Leave at {opt.leaveAt}</small>
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
                  <h1 className="text-center">Your Trip to {trip.name}</h1>
                  <h4 className="text-center">
                    {new Date(trip.startDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })} –
                    {new Date(trip.endDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
                  </h4>
                </Col>
              </Row>
              <Row className="g-4">
                {trip.days.map((day, idx) => renderDayCard(day, idx))}
              </Row>
            </Container>
          </main>
        </div>

        <Modal
          show={showAddEventModal}
          onHide={() => setShowAddEventModal(false)}
          dialogClassName="modal-autocomplete"
        >
          <Modal.Header closeButton>
            <Modal.Title>Add Event for {trip.days[selectedDayIndex]?.date}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <Form onSubmit={handleAddEvent}>
              <Form.Group className="mb-3">
                <Form.Label>Title</Form.Label>
                <Form.Control
                  type="text"
                  value={eventTitle}
                  onChange={e => setEventTitle(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Event Type</Form.Label>
                <Form.Select
                  value={eventType}
                  onChange={e => setEventType(e.target.value)}
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

              <Form.Group className="mb-3">
                <Form.Label>Start Time</Form.Label>
                <Form.Control
                  type="time"
                  value={eventStartTime}
                  onChange={e => setEventStartTime(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>End Time</Form.Label>
                <Form.Control
                  type="time"
                  value={eventEndTime}
                  onChange={e => setEventEndTime(e.target.value)}
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
                <Form.Label>Travel Mode</Form.Label>
                <Form.Select value={travelMode} onChange={e => setTravelMode(e.target.value)}>
                  <option value="DRIVING">Driving</option>
                  <option value="TRANSIT">Public Transit</option>
                </Form.Select>
              </Form.Group>

              <Button type="submit">Save Event</Button>
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
                {collaboratorsData.map((c) => (
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
      <Form.Control
        type="text"
        placeholder="Enter place or address"
        value={value}
        onChange={e => setValue(e.target.value)}
        required
      />
    </Autocomplete>
  );
}

export default TripPage;