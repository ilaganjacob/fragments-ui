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


async function init() {
  // Get our UI elements
  const userSection = document.querySelector('#user');
  const loginBtn = document.querySelector('#login');

  // Wire up event handlers to deal with login and logout.
  loginBtn.onclick = () => {
    // Sign-in via the Amazon Cognito Hosted UI (requires redirects)
    signIn();
  };

  // See if we're signed in (i.e., we'll have a `user` object)
  const user = await getUser();
  
  if (!user) {
    return;
  }

  //Do an authenticated request to the fragments API server and log the result
  const userFragments = await getUserFragments(user);

  

  // Update the UI to welcome the user
  userSection.hidden = false;

  // Show the user's username
  userSection.querySelector('.username').innerText = user.username;

  // Disable the Login button
  loginBtn.disabled = true;
}

// Wait for the DOM to be ready, then start the app
addEventListener('DOMContentLoaded', init);