// src/app.js

import { signIn, getUser } from './auth';
import { getUserFragments } from './api';

// Cache DOM elements we'll need to reference
const elements = {
  userSection: () => document.querySelector('#user'),
  loginBtn: () => document.querySelector('#login'),
  username: () => document.querySelector('.username'),
  fragmentText: () => document.querySelector('#fragment-text'),
  createBtn: () => document.querySelector('#create-button'),
  createStatus: () => document.querySelector('#create-status'),
  fragmentsList: () => document.querySelector('#fragments'),
};

async function displayFragments(user) {
  try {
    const {fragments} = await getUserFragments(user);
    const fragmentList = elements.fragmentsList();
    fragmentList.innerHTML = '';

    if (fragments.length === 0) {
      fragmentList.innerHTML = '<p>No fragments found.</p>';
      return;
    }

    // For each fragment ID, create a list item
    for (const id of fragments) {
      const li = document.createElement('li');
      try {
        // Get the fragment's content
        const content = await getFragment(user, id);
        li.textContent = `${id}: ${content.substring(0,60)}...` //  Show preview of content
      } catch (err) {
        li.textContent = `${id}: [Error loading fragment]`;
      }
      fragmentList.appendChild(li);
    }
  } catch (err) {
    console.error('Error loading fragments', err);
  }
}

// Handle fragment creation
async function handleCreateFragment(user) {
  const text = elements.fragmentText().value.trim();
  if (!text) {
    elements.createStatus().textContent = 'Please enter some text';
    return;
  }

  try {
    elements.createBtn().disabled = true;
    elements.createStatus().textContent = 'Creating fragment...';
    
    await createFragment(user, text);
    
    // Clear form and show success
    elements.fragmentText().value = '';
    elements.createStatus().textContent = 'Fragment created successfully!';
    
    // Refresh the fragments list
    await displayFragments(user);
  } catch (err) {
    elements.createStatus().textContent = `Error: ${err.message}`;
  } finally {
    elements.createBtn().disabled = false;
  }
}

async function init() {
  // Wire up event handlers to deal with login
  elements.loginBtn().onclick = () => {
    signIn();
  };

  // See if we're signed in (i.e., we'll have a `user` object)
  const user = await getUser();
  if (!user) {
    return;
  }

  // Update the UI to welcome the user
  elements.userSection().hidden = false;
  elements.username().innerText = user.username;
  elements.loginBtn().disabled = true;

  // Wire up fragment creation
  elements.createBtn().onclick = () => handleCreateFragment(user);

  // Display any existing fragments
  await displayFragments(user);
}

// Wait for the DOM to be ready, then start the app
addEventListener('DOMContentLoaded', init);