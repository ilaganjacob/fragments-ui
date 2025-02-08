// src/app.js
import { signIn, getUser } from './auth';
import { getUserFragments, createFragment, getFragment } from './api';

async function init() {
  console.log('App initializing...');
  
  // Get our UI elements
  const userSection = document.querySelector('#user');
  const loginBtn = document.querySelector('#login');
  const createBtn = document.querySelector('#createBtn');
  const fragmentText = document.querySelector('#fragmentText');
  const createStatus = document.querySelector('#createStatus');
  const fragmentsList = document.querySelector('#fragmentsList');


  // Wire up event handlers to deal with login
  loginBtn.onclick = () => {
    console.log('Login button clicked');
    signIn();
  };

  // See if we're signed in
  const user = await getUser();
  console.log('User auth state:', !!user);

  if (!user) {
    return;
  }

  console.log('User is authenticated, showing UI');
  
  // Update the UI to welcome the user
  userSection.hidden = false;
  userSection.querySelector('.username').innerText = user.username;
  loginBtn.disabled = true;

  // Handle fragment creation
  createBtn.onclick = async () => {
    const text = fragmentText.value.trim();
    if (!text) {
      createStatus.textContent = 'Please enter some text';
      return;
    }

    try {
      createBtn.disabled = true;
      createStatus.textContent = 'Creating fragment...';
      
      await createFragment(user, text);
      
      // Clear form and show success
      fragmentText.value = '';
      createStatus.textContent = 'Fragment created successfully!';
      
      // Refresh the fragments list
      displayFragments();
    } catch (err) {
      createStatus.textContent = `Error: ${err.message}`;
    } finally {
      createBtn.disabled = false;
    }
  };

  // Function to display fragments
  async function displayFragments() {
    try {
      const { fragments } = await getUserFragments(user);
      fragmentsList.innerHTML = ''; // Clear existing list

      if (fragments.length === 0) {
        fragmentsList.innerHTML = '<li>No fragments yet</li>';
        return;
      }

      // For each fragment ID, create a list item
      for (const id of fragments) {
        const li = document.createElement('li');
        try {
          // Get the fragment's content
          const content = await getFragment(user, id);
          li.textContent = `${id}: ${content.substring(0, 60)}...`; // Show preview
        } catch (err) {
          li.textContent = `${id}: [Error loading fragment]`;
        }
        fragmentsList.appendChild(li);
      }
    } catch (err) {
      console.error('Error displaying fragments:', err);
    }
  }

  // Display any existing fragments on load
  displayFragments();
}

// Wait for the DOM to be ready, then start the app
addEventListener('DOMContentLoaded', init);