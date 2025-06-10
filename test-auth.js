// Test script to register admin user and test authentication
const API_BASE_URL = 'http://localhost:3000/api';

async function testAuth() {
  try {
    console.log('Testing authentication system...');
    
    // Test registration
    console.log('1. Testing registration...');
    const registerResponse = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'sshk5318@gmail.com',
        password: 'sshk5318',
        firstName: 'Admin',
        lastName: 'User',
        organizationName: 'AdminOrg'
      })
    });

    const registerResult = await registerResponse.json();
    console.log('Registration result:', registerResult);

    if (registerResponse.ok) {
      console.log('✅ Registration successful!');
      
      // Test login
      console.log('2. Testing login...');
      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'sshk5318@gmail.com',
          password: 'sshk5318'
        })
      });

      const loginResult = await loginResponse.json();
      console.log('Login result:', loginResult);

      if (loginResponse.ok) {
        console.log('✅ Login successful!');
        console.log('Token:', loginResult.token);
        console.log('User:', loginResult.user);
        
        // Test profile endpoint
        console.log('3. Testing profile endpoint...');
        const profileResponse = await fetch(`${API_BASE_URL}/auth/profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${loginResult.token}`,
            'Content-Type': 'application/json',
          }
        });

        const profileResult = await profileResponse.json();
        console.log('Profile result:', profileResult);

        if (profileResponse.ok) {
          console.log('✅ Profile endpoint working!');
        } else {
          console.log('❌ Profile endpoint failed:', profileResult);
        }
      } else {
        console.log('❌ Login failed:', loginResult);
      }
    } else {
      console.log('❌ Registration failed:', registerResult);
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testAuth(); 