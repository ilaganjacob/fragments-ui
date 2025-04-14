// src/app.js
import { signIn, getUser } from "./auth";
import { getUserFragments, createFragment, getFragment } from "./api";

// This toggles between text input and file input based on content type
contentTypeSelect.addEventListener('change', function() {
  const selectedType = this.value;
  
  // Show file input for image types, text input for others
  if (selectedType.startsWith('image/')) {
    fragmentText.style.display = 'none';
    fragmentFile.style.display = 'block';
  } else {
    fragmentText.style.display = 'block';
    fragmentFile.style.display = 'none';
  }
});


async function init() {
  console.log("App initializing...");

  // Get our UI elements
  const userSection = document.querySelector("#user");
  const loginBtn = document.querySelector("#login");
  const createBtn = document.querySelector("#createBtn");
  const fragmentText = document.querySelector("#fragmentText");
  const fragmentFile = document.querySelector("#fragmentFile");
  const contentTypeSelect = document.querySelector("#contentTypeSelect");
  const createStatus = document.querySelector("#createStatus");
  const fragmentsList = document.querySelector("#fragmentsList");
  const refreshBtn = document.querySelector("#refreshBtn");
  const requestDetails = document.querySelector("#requestDetails");
  const requestInfo = document.querySelector("#requestInfo");
  const responseHeaders = document.querySelector("#responseHeaders");
  const apiUrlDisplay = document.querySelector("#apiUrlDisplay");

  // Display the API URL we're using
  apiUrlDisplay.textContent = process.env.API_URL || "http://localhost:8080";

  // Show/hide text area or file input based on content type
  contentTypeSelect.addEventListener("change", () => {
    const selectedType = contentTypeSelect.value;

    // For image types, show file input and hide text area
    if (selectedType.startsWith("image/")) {
      fragmentText.style.display = "none";
      fragmentFile.style.display = "block";
    } else {
      fragmentText.style.display = "block";
      fragmentFile.style.display = "none";
    }
  });

  // Wire up event handlers to deal with login
  loginBtn.onclick = () => {
    console.log("Login button clicked");
    signIn();
  };

  // See if we're signed in
  const user = await getUser();
  console.log("User auth state:", !!user);

  if (!user) {
    return;
  }

  console.log("User is authenticated, showing UI");

  // Update the UI to welcome the user
  userSection.hidden = false;
  userSection.querySelector(".username").innerText = user.username;
  loginBtn.disabled = true;

  // Handle fragment creation
  createBtn.onclick = async () => {
    const contentType = contentTypeSelect.value;
    let content;
    
    // Disable button while processing
    createBtn.disabled = true;
    createStatus.textContent = 'Creating fragment...';
    
    try {
      // Handle different content types
      if (contentType.startsWith('image/')) {
        // For image uploads, get the file
        if (!fragmentFile.files || !fragmentFile.files[0]) {
          createStatus.textContent = 'Please select an image file';
          createBtn.disabled = false;
          return;
        }
        
        const file = fragmentFile.files[0];
        console.log('File selected:', file.name, file.type, file.size);
        
        // Display request info
        requestInfo.textContent = `POST /v1/fragments\nContent-Type: ${contentType}\nContent length: ${file.size} bytes`;
        requestDetails.hidden = false;
        
        // Read the file as an ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        
        // Create the fragment with proper content type
        const response = await fetch(`${apiUrl}/v1/fragments`, {
          method: 'POST',
          headers: {
            'Content-Type': contentType,
            ...user.authorizationHeaders()
          },
          body: arrayBuffer
        });
        
        if (!response.ok) {
          throw new Error(`Error creating fragment: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Display response headers
        responseHeaders.textContent = 
          `Status: ${response.status}\n` +
          `Location: ${response.headers.get('Location') || 'N/A'}\n` +
          `Content-Type: ${response.headers.get('Content-Type') || 'N/A'}`;
        
        // Clear form and show success
        fragmentFile.value = '';
        createStatus.textContent = 'Fragment created successfully!';
        
        // Refresh the fragments list
        await displayFragments();
      } else {
        // For text-based content
        const text = fragmentText.value.trim();
        
        if (!text) {
          createStatus.textContent = 'Please enter some content';
          createBtn.disabled = false;
          return;
        }
        
        // Display request info
        requestInfo.textContent = `POST /v1/fragments\nContent-Type: ${contentType}\nContent length: ${text.length} bytes`;
        requestDetails.hidden = false;
        
        // Use your existing createFragment function for text content
        const response = await createFragment(user, text, contentType);
        
        // Display response headers
        if (response.headers) {
          responseHeaders.textContent = 
            `Status: ${response.status}\n` +
            `Location: ${response.headers.location || 'N/A'}\n` +
            `Content-Type: ${response.headers.contentType || 'N/A'}`;
        }
        
        // Clear form and show success
        fragmentText.value = '';
        createStatus.textContent = 'Fragment created successfully!';
        
        // Refresh the fragments list
        await displayFragments();
      }
    } catch (err) {
      console.error('Error creating fragment:', err);
      createStatus.textContent = `Error: ${err.message}`;
    } finally {
      createBtn.disabled = false;
    }
  };

  // Handle refresh button
  refreshBtn.onclick = () => {
    displayFragments();
  };

  // // Function to display fragments with expanded metadata
  // async function displayFragments() {
  //   try {
  //     fragmentsList.innerHTML = '<p>Loading fragments...</p>';

  //     const data = await getUserFragments(user, true); // Get expanded fragment data
  //     const { fragments } = data;

  //     fragmentsList.innerHTML = ''; // Clear existing list

  //     if (!fragments || fragments.length === 0) {
  //       fragmentsList.innerHTML = '<p>No fragments yet</p>';
  //       return;
  //     }

  //     // For each fragment, create a display card
  //     fragments.forEach(fragment => {
  //       const fragmentDiv = document.createElement('div');
  //       fragmentDiv.className = 'fragment-item';

  //       // Create fragment header with ID and type
  //       const header = document.createElement('h4');
  //       header.textContent = `${fragment.id.substring(0, 8)}... (${fragment.type})`;
  //       fragmentDiv.appendChild(header);

  //       // Create metadata section
  //       const metadata = document.createElement('div');
  //       metadata.className = 'fragment-metadata';
  //       metadata.innerHTML = `
  //         <div>Created: ${new Date(fragment.created).toLocaleString()}</div>
  //         <div>Updated: ${new Date(fragment.updated).toLocaleString()}</div>
  //         <div>Size: ${fragment.size} bytes</div>
  //       `;
  //       fragmentDiv.appendChild(metadata);

  //       // Create actions section
  //       const actions = document.createElement('div');
  //       actions.className = 'fragment-actions';

  //       // Preview button
  //       const previewBtn = document.createElement('button');
  //       previewBtn.textContent = 'View Content';

  //       // Preview button functionality
  //       previewBtn.onclick = async () => {
  //         try {
  //           // Check if preview is already shown
  //           let preview = fragmentDiv.querySelector('.fragment-content');
  //           if (preview) {
  //             preview.remove();
  //             previewBtn.textContent = 'Preview Content';
  //             return;
  //           }

  //           previewBtn.textContent = 'Loading...';
  //           const response = await getFragment(user, fragment.id);

  //           // Create or update the preview
  //           preview = document.createElement('div');
  //           preview.className = 'fragment-content';

  //           // Handle different content types based on the fragment's type
  //           if (fragment.type.startsWith('image/')) {
  //             // For image fragments, create an img element
  //             const img = document.createElement('img');
  //             // We need to create a blob URL from the response
  //             const blob = new Blob([response], { type: fragment.type });
  //             img.src = URL.createObjectURL(blob);
  //             img.alt = 'Fragment image';
  //             preview.appendChild(img);
  //             preview.classList.add('image-preview');
  //           } else if (fragment.type.includes('json')) {
  //             try {
  //               const formattedJson = JSON.stringify(JSON.parse(response), null, 2);
  //               preview.textContent = formattedJson;
  //             } catch (e) {
  //               preview.textContent = response;
  //             }
  //           } else {
  //             // For text content
  //             preview.textContent = response;
  //           }

  //           fragmentDiv.appendChild(preview);
  //           previewBtn.textContent = 'Hide Content';
  //         } catch (err) {
  //           console.error('Error loading fragment:', err);
  //           previewBtn.textContent = 'Error loading preview';
  //         }
  //       };
  //       actions.appendChild(previewBtn);

  //       // Add conversion options based on fragment type
  //       if (fragment.type.startsWith('image/')) {
  //         // Image conversion options
  //         const formats = ['png', 'jpg', 'webp', 'gif'];

  //         // Only add conversion buttons for formats different from the current one
  //         const currentFormat = fragment.type.split('/')[1].toLowerCase();
  //         const formatButton = document.createElement('button');
  //         formatButton.textContent = 'Convert To:';
  //         formatButton.disabled = true;
  //         formatButton.style.marginLeft = '10px';
  //         actions.appendChild(formatButton);

  //         formats.forEach(format => {
  //           // Skip the current format
  //           if ((format === 'png' && fragment.type === 'image/png') ||
  //               (format === 'jpg' && fragment.type === 'image/jpeg') ||
  //               (format === 'webp' && fragment.type === 'image/webp') ||
  //               (format === 'gif' && fragment.type === 'image/gif')) {
  //             return;
  //           }

  //           const convBtn = document.createElement('button');
  //           convBtn.textContent = format.toUpperCase();
  //           convBtn.style.marginLeft = '5px';
  //           convBtn.onclick = async () => {
  //             try {
  //               convBtn.disabled = true;

  //               // Create or update image preview
  //               let imgPreview = fragmentDiv.querySelector('.image-preview');
  //               if (!imgPreview) {
  //                 imgPreview = document.createElement('div');
  //                 imgPreview.className = 'image-preview';
  //                 fragmentDiv.appendChild(imgPreview);
  //               }

  //               imgPreview.innerHTML = 'Converting image...';

  //               // Fetch the converted image
  //               const response = await fetch(`${process.env.API_URL}/v1/fragments/${fragment.id}.${format}`, {
  //                 headers: user.authorizationHeaders()
  //               });

  //               if (!response.ok) {
  //                 throw new Error(`Error: ${response.status} ${response.statusText}`);
  //               }

  //               const blob = await response.blob();
  //               const url = URL.createObjectURL(blob);

  //               // Display the converted image
  //               imgPreview.innerHTML = `
  //                 <h4>Converted to ${format.toUpperCase()}</h4>
  //                 <img src="${url}" alt="Converted image">
  //                 <a href="${url}" download="fragment-${fragment.id.substring(0, 8)}.${format}">Download</a>
  //               `;

  //               convBtn.disabled = false;
  //             } catch (err) {
  //               console.error('Error converting image:', err);
  //               fragmentDiv.querySelector('.image-preview').innerHTML = `Error converting to ${format}`;
  //               convBtn.disabled = false;
  //             }
  //           };

  //           actions.appendChild(convBtn);
  //         });
  //       } else if (fragment.type === 'text/markdown') {
  //         // Add HTML preview button for markdown
  //         const htmlBtn = document.createElement('button');
  //         htmlBtn.textContent = 'HTML Preview';
  //         htmlBtn.style.marginLeft = '10px';
  //         htmlBtn.onclick = async () => {
  //           try {
  //             htmlBtn.disabled = true;

  //             // Check if HTML preview already exists
  //             let htmlPreview = fragmentDiv.querySelector('.html-preview');
  //             if (htmlPreview) {
  //               htmlPreview.remove();
  //               htmlBtn.textContent = 'HTML Preview';
  //               htmlBtn.disabled = false;
  //               return;
  //             }

  //             htmlBtn.textContent = 'Loading...';

  //             // Get HTML version
  //             const response = await fetch(`${process.env.API_URL}/v1/fragments/${fragment.id}.html`, {
  //               headers: user.authorizationHeaders()
  //             });

  //             if (!response.ok) {
  //               throw new Error(`Error: ${response.status} ${response.statusText}`);
  //             }

  //             const html = await response.text();

  //             // Create and display HTML preview
  //             htmlPreview = document.createElement('div');
  //             htmlPreview.className = 'html-preview';
  //             htmlPreview.innerHTML = html;

  //             fragmentDiv.appendChild(htmlPreview);
  //             htmlBtn.textContent = 'Hide HTML';
  //             htmlBtn.disabled = false;
  //           } catch (err) {
  //             console.error('Error loading HTML preview:', err);
  //             htmlBtn.textContent = 'Error loading HTML';
  //             htmlBtn.disabled = false;
  //           }
  //         };

  //         actions.appendChild(htmlBtn);
  //       } else if (fragment.type === 'application/json') {
  //         // Add YAML conversion button for JSON
  //         const yamlBtn = document.createElement('button');
  //         yamlBtn.textContent = 'YAML View';
  //         yamlBtn.style.marginLeft = '10px';
  //         yamlBtn.onclick = async () => {
  //           try {
  //             yamlBtn.disabled = true;

  //             // Check if YAML preview already exists
  //             let yamlPreview = fragmentDiv.querySelector('.yaml-preview');
  //             if (yamlPreview) {
  //               yamlPreview.remove();
  //               yamlBtn.textContent = 'YAML View';
  //               yamlBtn.disabled = false;
  //               return;
  //             }

  //             yamlBtn.textContent = 'Loading...';

  //             // Get YAML version
  //             const response = await fetch(`${process.env.API_URL}/v1/fragments/${fragment.id}.yaml`, {
  //               headers: user.authorizationHeaders()
  //             });

  //             if (!response.ok) {
  //               throw new Error(`Error: ${response.status} ${response.statusText}`);
  //             }

  //             const yaml = await response.text();

  //             // Create and display YAML preview
  //             yamlPreview = document.createElement('div');
  //             yamlPreview.className = 'yaml-preview';
  //             yamlPreview.innerHTML = `<pre>${yaml}</pre>`;

  //             fragmentDiv.appendChild(yamlPreview);
  //             yamlBtn.textContent = 'Hide YAML';
  //             yamlBtn.disabled = false;
  //           } catch (err) {
  //             console.error('Error loading YAML preview:', err);
  //             yamlBtn.textContent = 'Error loading YAML';
  //             yamlBtn.disabled = false;
  //           }
  //         };

  //         actions.appendChild(yamlBtn);
  //       }

  //       // Add delete button
  //       const deleteBtn = document.createElement('button');
  //       deleteBtn.textContent = 'Delete';
  //       deleteBtn.style.marginLeft = 'auto';
  //       deleteBtn.onclick = async () => {
  //         if (confirm('Are you sure you want to delete this fragment?')) {
  //           try {
  //             deleteBtn.disabled = true;

  //             // Delete the fragment
  //             const response = await fetch(`${process.env.API_URL}/v1/fragments/${fragment.id}`, {
  //               method: 'DELETE',
  //               headers: user.authorizationHeaders()
  //             });

  //             if (!response.ok) {
  //               throw new Error(`Error: ${response.status} ${response.statusText}`);
  //             }

  //             // Remove from the UI
  //             fragmentDiv.remove();
  //           } catch (err) {
  //             console.error('Error deleting fragment:', err);
  //             alert(`Error deleting fragment: ${err.message}`);
  //             deleteBtn.disabled = false;
  //           }
  //         }
  //       };

  //       actions.appendChild(deleteBtn);
  //       fragmentDiv.appendChild(actions);
  //       fragmentsList.appendChild(fragmentDiv);
  //     });
  //   } catch (err) {
  //     console.error('Error displaying fragments:', err);
  //     fragmentsList.innerHTML = `<p>Error: ${err.message}</p>`;
  //   }
  // }
  // Function to display fragments with expanded metadata
  async function displayFragments() {
    try {
      fragmentsList.innerHTML = "<p>Loading fragments...</p>";

      const data = await getUserFragments(user, true); // Get expanded fragment data
      const { fragments } = data;

      fragmentsList.innerHTML = ""; // Clear existing list

      if (!fragments || fragments.length === 0) {
        fragmentsList.innerHTML = "<p>No fragments yet</p>";
        return;
      }

      // For each fragment, create a display card
      fragments.forEach((fragment) => {
        const fragmentDiv = document.createElement("div");
        fragmentDiv.className = "fragment-item";

        // Create fragment header with ID and type
        const header = document.createElement("h4");
        header.textContent = `${fragment.id.substring(0, 8)}... (${
          fragment.type
        })`;
        fragmentDiv.appendChild(header);

        // Create metadata section
        const metadata = document.createElement("div");
        metadata.className = "fragment-metadata";
        metadata.innerHTML = `
        <div>Created: ${new Date(fragment.created).toLocaleString()}</div>
        <div>Updated: ${new Date(fragment.updated).toLocaleString()}</div>
        <div>Size: ${fragment.size} bytes</div>
      `;
        fragmentDiv.appendChild(metadata);

        // Create content preview button
        const previewBtn = document.createElement("button");
        previewBtn.textContent = "Preview Content";
        previewBtn.onclick = async () => {
          try {
            // Check if preview is already shown
            let preview = fragmentDiv.querySelector(".fragment-content");
            if (preview) {
              preview.remove();
              previewBtn.textContent = "Preview Content";
              return;
            }

            previewBtn.textContent = "Loading...";

            // Get the fragment data
            const res = await fetch(`${apiUrl}/v1/fragments/${fragment.id}`, {
              headers: user.authorizationHeaders(),
            });

            if (!res.ok) {
              throw new Error(`Error fetching fragment: ${res.status}`);
            }

            // Create preview container
            preview = document.createElement("div");
            preview.className = "fragment-content";

            // Handle based on content type
            if (fragment.type.startsWith("image/")) {
              // For images, create an img element with a blob URL
              const arrayBuffer = await res.arrayBuffer();
              const blob = new Blob([arrayBuffer], { type: fragment.type });
              const imageUrl = URL.createObjectURL(blob);

              const img = document.createElement("img");
              img.src = imageUrl;
              img.alt = "Fragment image";
              img.style.maxWidth = "100%";

              preview.appendChild(img);
              preview.classList.add("image-preview");
            } else if (fragment.type.includes("application/json")) {
              // For JSON, format it
              const jsonText = await res.text();
              try {
                const formattedJson = JSON.stringify(
                  JSON.parse(jsonText),
                  null,
                  2
                );
                preview.textContent = formattedJson;
              } catch (e) {
                preview.textContent = jsonText;
              }
            } else {
              // For other content, just show as text
              preview.textContent = await res.text();
            }

            fragmentDiv.appendChild(preview);
            previewBtn.textContent = "Hide Content";
          } catch (err) {
            console.error("Error loading fragment:", err);
            previewBtn.textContent = "Error loading preview";
          }
        };

        // Create actions section
        const actions = document.createElement("div");
        actions.className = "fragment-actions";
        actions.appendChild(previewBtn);

        // Add conversion buttons for images
        if (fragment.type.startsWith("image/")) {
          const addConversionButton = (format, label) => {
            // Skip if this is already the current format
            if (fragment.type === format) return;

            const convButton = document.createElement("button");
            convButton.textContent = label;
            convButton.style.marginLeft = "10px";

            convButton.onclick = async () => {
              try {
                // Figure out extension
                const ext = format.split("/")[1];
                const url = `${apiUrl}/v1/fragments/${fragment.id}.${ext}`;

                // Open in a new tab
                window.open(url, "_blank");
              } catch (err) {
                console.error("Error converting image:", err);
                alert(`Error converting image: ${err.message}`);
              }
            };

            actions.appendChild(convButton);
          };

          // Add conversion buttons for different formats
          addConversionButton("image/png", "View as PNG");
          addConversionButton("image/jpeg", "View as JPEG");
          addConversionButton("image/webp", "View as WebP");
        }

        // Add delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete-btn";
        deleteBtn.style.marginLeft = "10px";
        deleteBtn.onclick = async () => {
          if (confirm("Are you sure you want to delete this fragment?")) {
            try {
              const res = await fetch(`${apiUrl}/v1/fragments/${fragment.id}`, {
                method: "DELETE",
                headers: user.authorizationHeaders(),
              });

              if (!res.ok) {
                throw new Error(`Failed to delete: ${res.status}`);
              }

              // Remove this item from DOM
              fragmentDiv.remove();
            } catch (err) {
              console.error("Error deleting fragment:", err);
              alert(`Error deleting fragment: ${err.message}`);
            }
          }
        };
        actions.appendChild(deleteBtn);

        fragmentDiv.appendChild(actions);
        fragmentsList.appendChild(fragmentDiv);
      });
    } catch (err) {
      console.error("Error displaying fragments:", err);
      fragmentsList.innerHTML = `<p>Error: ${err.message}</p>`;
    }
  }

  // Display any existing fragments on load
  await displayFragments();
}

// Wait for the DOM to be ready, then start the app
addEventListener("DOMContentLoaded", init);
