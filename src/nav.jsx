import React from 'react';
import { Container, Nav, Navbar, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

function NavbarComponent() {
  return (
    <Navbar expand="lg" variant="dark" className="navbar">
      <Container>
        <Navbar.Brand as={Link} to="/" className="navbar-brand">
          ▲ Gator Trips
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="navbarScroll" />
        <Navbar.Collapse id="navbarScroll">
          <Nav className="mx-auto">
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            <Nav.Link as={Link} to="/#features">Features</Nav.Link>
            <Nav.Link as={Link} to="/#how-it-works">How It Works</Nav.Link>
            <Nav.Link as={Link} to="/#faq">FAQ</Nav.Link>
            <Nav.Link as={Link} to="/#contact">Contact</Nav.Link>
          </Nav>
          <Button href="/login" className="btn-cta">
            Get started <span className="arrow">→</span>
          </Button>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default NavbarComponent;