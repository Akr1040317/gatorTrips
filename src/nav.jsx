import React, { useState } from 'react';
import { Container, Nav, Navbar, Button, Dropdown, Modal } from 'react-bootstrap';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { auth, db } from './firebase';
import { collection, getDocs, deleteDoc, query, where } from 'firebase/firestore';

function NavbarComponent() {
  const { currentUser } = useAuth();
  const [showDeleteTripsModal, setShowDeleteTripsModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    setShowLogoutModal(false);
    navigate('/');
  };

  const handleDeleteAllTrips = async () => {
    const tripsCollection = collection(db, 'trips');
    const tripSnapshot = await getDocs(tripsCollection);
    const deletePromises = tripSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    setShowDeleteTripsModal(false);
    window.location.reload();  // Refresh the page after deleting all trips
  };

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (user) {
      // First, delete all trips belonging to the user
      const tripsCollection = collection(db, 'trips');
      const userTripsQuery = query(tripsCollection, where("userID", "==", user.uid));
      const userTripsSnapshot = await getDocs(userTripsQuery);
      const deleteTripsPromises = userTripsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteTripsPromises);

      // Then, delete the user's account
      await user.delete();
      setShowDeleteAccountModal(false);
      navigate('/');
    }
  };

  return (
    <Navbar expand="lg" variant="dark" className="navbar">
      <Container>
        <Navbar.Brand as={RouterLink} to="/" className="navbar-brand">
          ▲ Gator Trips
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="navbarScroll" />
        <Navbar.Collapse id="navbarScroll">
          <Nav className="mx-auto">
            <Nav.Link as={RouterLink} to="/">Home</Nav.Link>
            <Nav.Link href="/#features">Features</Nav.Link>
            <Nav.Link href="/#how-it-works">How It Works</Nav.Link>
            <Nav.Link href="/#faq">FAQ</Nav.Link>
            <Nav.Link href="/#contact">Contact</Nav.Link>
          </Nav>
          {currentUser ? (
            <>
              <Dropdown align="end" className="me-2">
                <Dropdown.Toggle variant="secondary" id="dropdown-basic">
                  My Profile
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  <Dropdown.Header>{currentUser.displayName || currentUser.email}</Dropdown.Header>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={() => setShowDeleteTripsModal(true)}>Delete all trips</Dropdown.Item>
                  <Dropdown.Item onClick={() => setShowDeleteAccountModal(true)}>Delete account</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
              <Button variant="danger" onClick={() => setShowLogoutModal(true)}>
                Logout
              </Button>
            </>
          ) : (
            <Button as={RouterLink} to="/login" className="btn-cta">
              Get started <span className="arrow">→</span>
            </Button>
          )}
        </Navbar.Collapse>
      </Container>

      {/* Delete All Trips Confirmation Modal */}
      <Modal show={showDeleteTripsModal} onHide={() => setShowDeleteTripsModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete All Trips</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete all trips?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteTripsModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteAllTrips}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal show={showDeleteAccountModal} onHide={() => setShowDeleteAccountModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete Account</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete your account?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteAccountModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteAccount}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal show={showLogoutModal} onHide={() => setShowLogoutModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Logout</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to log out?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleLogout}>
            Logout
          </Button>
        </Modal.Footer>
      </Modal>
    </Navbar>
  );
}

export default NavbarComponent;