import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import './index.css';

function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      // Create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update user profile with display name
      await updateProfile(user, { displayName });

      // Add user to Firestore
      await addDoc(collection(db, 'users'), {
        userid: user.uid,
        createdAt: new Date(),
        password: password, // Note: Storing passwords in plain text is not recommended in production
        email: email,
        displayName: displayName
      });

      navigate('/'); // Redirect to home after successful signup
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <Container className="my-5">
      <Row className="justify-content-center">
        <Col md={6}>
          <div className="auth-card">
            <h2 className="section-title text-center text-teal mb-4">Sign Up</h2>
            {error && <p className="text-danger text-center">{error}</p>}
            <Form onSubmit={handleSignup}>
              <Form.Group className="mb-3" controlId="formDisplayName">
                <Form.Label>Display Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="formEmail">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="formPassword">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Form.Group>

              <Button variant="primary" type="submit" className="btn-cta w-100">
                Sign Up
              </Button>
            </Form>
            <p className="mt-3 text-center">
              Already have an account?{' '}
              <a href="/login" className="text-teal">
                Login
              </a>
            </p>
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default Signup;