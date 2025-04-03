import React, { useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import './index.css';

// Import images
import heroBg from './assets/images/hero-bg.jpg';
import beachBoats from './assets/images/beach-boats.jpg';
import hikingTrail from './assets/images/hiking-trail.jpg';
import resort from './assets/images/resort.jpg';
import museum from './assets/images/museum.jpg';
import beachLounging from './assets/images/beach-lounging.jpg';
import cliffside from './assets/images/cliffside.jpg';
import howItWorksBeach from './assets/images/how-it-works-beach.jpg';
import faqMap from './assets/images/faq-map.jpg';
import contactAirplane from './assets/images/contact-airplane.jpg';

function Home() {
  useEffect(() => {
    
  }, []);

  return (
    <>
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>Effortless Travel Planning for Every Adventure</h1>
          <Button href="/login" className="btn-cta">
            Start Planning Now
          </Button>
        </div>
      </div>

      {/* Plan Your Journey Section (Teal BG) */}
      <section className="section section-journey bg-teal">
        <Container>
          <Row className="align-items-center">
            <Col md={6}>
              <h2 className="section-title-light">
                Plan Your Entire Journey <br /> in One Place
              </h2>
              <p className="text-light">
                From flights and accommodations to curated itineraries—Gator Trips
                makes travel planning simple and stress-free.
              </p>
            </Col>
            <Col md={6}>
              <div className="journey-images">
                <img
                  src={beachBoats}
                  alt="Beach Boats"
                  className="journey-img-top"
                />
                <img
                  src={hikingTrail}
                  alt="Hiking Trail"
                  className="journey-img-bottom"
                />
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Key Features Section (White BG) */}
      <section id="features" className="section section-features bg-white">
        <Container>
          <h2 className="section-title text-center">KEY FEATURES</h2>
          <Row className="mt-5">
            <Col md={3}>
              <Card className="feature-card">
                <Card.Img variant="top" src={resort} />
                <Card.Body>
                  <Card.Title>All-in-One Travel Planner</Card.Title>
                  <Card.Text>
                    Seamlessly integrates transportation, accommodations, and activities into one platform.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="feature-card">
                <Card.Img variant="top" src={museum} />
                <Card.Body>
                  <Card.Title>Smart-Route Planning</Card.Title>
                  <Card.Text>
                    Generates ideal travel routes, considering travel times, locations, and layovers.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="feature-card">
                <Card.Img variant="top" src={beachLounging} />
                <Card.Body>
                  <Card.Title>Itinerary Management</Card.Title>
                  <Card.Text>
                    Automatically schedules activities, ensuring efficient use of time and buffer periods.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="feature-card">
                <Card.Img variant="top" src={cliffside} />
                <Card.Body>
                  <Card.Title>Collaboration</Card.Title>
                  <Card.Text>
                    Allows for collaboration on the schedule from multiple people if there are multiple travelers.
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* How It Works Section (Teal BG) */}
      <section id="how-it-works" className="section bg-teal section-how-it-works">
        <Container>
          <Row className="align-items-center">
            <Col md={6}>
              <h2 className="section-title-light">How It Works</h2>
              <ol className="how-list">
                <li>
                  <strong>Enter Trip Details</strong>
                  <p>Start & end points, plus optional stops (or let us suggest).</p>
                </li>
                <li>
                  <strong>Choose Transportation</strong>
                  <p>Fastest, cheapest, or minimal transfers—flights, trains, cabs, all in one place.</p>
                </li>
                <li>
                  <strong>Pick Accommodations</strong>
                  <p>Recommendations near each stop, filter by budget or style.</p>
                </li>
                <li>
                  <strong>Collaborate & Finalize</strong>
                  <p>Invite others to view and edit your plan.</p>
                </li>
                <li>
                  <strong>Enjoy Your Trip!</strong>
                  <p>One-Click Overview: Keep everything in one place.</p>
                </li>
              </ol>
            </Col>
            <Col md={6}>
              <img
                src={howItWorksBeach}
                alt="How It Works"
                className="img-fluid rounded shadow"
              />
            </Col>
          </Row>
        </Container>
      </section>

      {/* FAQ Section (White BG) */}
      <section id="faq" className="section section-faq bg-white">
        <Container>
          <Row className="align-items-center">
            <Col md={6}>
              <h2 className="section-title text-teal">Frequently Asked Questions</h2>
              <div className="faq-list">
                <h5>Is Gator Trips free to use?</h5>
                <p>
                  Yes! You can plan your entire trip—flights, accommodations, activities—
                  without any cost.
                </p>

                <h5>How do I plan a multi-stop trip?</h5>
                <p>
                  Simply enter your start and end points, then add any destinations
                  in between. Our system will suggest the best routes based on your
                  preferences.
                </p>

                <h5>Can I collaborate with friends or family?</h5>
                <p>
                  Absolutely. Invite others to your itinerary so they can view or edit stops
                  and activities.
                </p>

                <h5>What if I want the fastest or cheapest route?</h5>
                <p>
                  We compare different travel options—flights, trains, cabs—and let you
                  choose the fastest route, the least expensive route, or the one with the
                  fewest transfers.
                </p>

                <h5>Does Gator Trips help with accommodations?</h5>
                <p>
                  Yes. We’ll recommend hotels or rentals near your chosen stops, and you
                  can filter them by budget, style, or amenities.
                </p>

                <h5>Can I update my plans on the go?</h5>
                <p>
                  We are currently working on this feature but hope to have it soon!
                </p>
              </div>
            </Col>
            <Col md={6}>
              <img
                src={faqMap}
                alt="FAQ Map"
                className="img-fluid rounded shadow"
              />
            </Col>
          </Row>
        </Container>
      </section>

      {/* Contact Us Section (Dark/Teal BG) */}
      <section id="contact" className="section section-contact bg-dark-teal">
        <Container>
          <Row className="align-items-center">
            <Col md={6}>
              <h2 className="section-title-light">Contact Us</h2>
              <p className="text-light">
                We’re here to help! Reach out to us through any of the channels below.
              </p>
              <h5 className="text-light">Our email:</h5>
              <ul className="contact-list">
                <li></li>
              </ul>
              <h5 className="text-light">Phone Number:</h5>
            </Col>
            <Col md={6}>
              <img
                src={contactAirplane}
                alt="Contact Airplane"
                className="img-fluid rounded shadow"
              />
            </Col>
          </Row>
        </Container>
      </section>
    </>
  );
}

export default Home;
