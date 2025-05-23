// src/app.js
import { signIn, getUser } from "./auth";
import {
  getUserFragments,
  createFragment,
  getFragment,
  deleteFragment,
  updateFragment
} from "./api";

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
  apiUrlDisplay.textContent = process.env.API_URL;

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

  // Update the createBtn.onclick handler to handle image uploads
  createBtn.onclick = async () => {
    const contentType = contentTypeSelect.value;

    createBtn.disabled = true;

    try {
      // Handle different content types
      if (contentType.startsWith("image/")) {
        // For image uploads, get the file
        if (!fragmentFile.files || !fragmentFile.files[0]) {
          createStatus.textContent = "Please select an image file";
          createBtn.disabled = false;
          return;
        }

        const file = fragmentFile.files[0];
        createStatus.textContent = `Creating ${contentType} fragment...`;

        // Display request info
        requestInfo.textContent = `POST /v1/fragments\nContent-Type: ${contentType}\nContent length: ${file.size} bytes`;
        requestDetails.hidden = false;

        // Read the file as an ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Use your existing createFragment function
        const response = await createFragment(user, arrayBuffer, contentType);

        // Display response headers
        responseHeaders.textContent =
          `Status: ${response.status}\n` +
          `Location: ${response.headers.location || "N/A"}\n` +
          `Content-Type: ${response.headers.contentType || "N/A"}`;

        // Clear form and show success
        fragmentFile.value = "";
        createStatus.textContent = "Fragment created successfully!";
      } else {
        // For text-based content (your existing code)
        const text = fragmentText.value.trim();

        if (!text) {
          createStatus.textContent = "Please enter some content";
          createBtn.disabled = false;
          return;
        }

        createStatus.textContent = `Creating ${contentType} fragment...`;

        // Display request info
        requestInfo.textContent = `POST /v1/fragments\nContent-Type: ${contentType}\nContent length: ${text.length} bytes`;
        requestDetails.hidden = false;

        const response = await createFragment(user, text, contentType);

        // Display response headers
        responseHeaders.textContent =
          `Status: ${response.status}\n` +
          `Location: ${response.headers.location || "N/A"}\n` +
          `Content-Type: ${response.headers.contentType || "N/A"}`;

        // Clear form and show success
        fragmentText.value = "";
        createStatus.textContent = "Fragment created successfully!";
      }

      // Refresh the fragments list
      await displayFragments();
    } catch (err) {
      console.error("Error creating fragment:", err);
      createStatus.textContent = `Error: ${err.message}`;
    } finally {
      createBtn.disabled = false;
    }
  };

  // Handle refresh button
  refreshBtn.onclick = () => {
    displayFragments();
  };

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
          <div>Type: ${fragment.type}</div>
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
            const content = await getFragment(user, fragment.id);

            // Create or update the preview
            preview = document.createElement("div");
            preview.className = "fragment-content";

            // Handle different content types based on fragment's type
            if (fragment.type.startsWith("image/")) {
              // For images, create an img element with a blob URL
              const blob = new Blob([content], { type: fragment.type });
              const imageUrl = URL.createObjectURL(blob);

              const img = document.createElement("img");
              img.src = imageUrl;
              img.alt = "Fragment image";
              img.style.maxWidth = "100%";
              img.style.maxHeight = "300px";

              preview.appendChild(img);
              preview.classList.add("image-preview");
            } else if (fragment.type.includes("json")) {
              try {
                // For JSON, try to format it nicely
                const formattedJson =
                  typeof content === "object"
                    ? JSON.stringify(content, null, 2)
                    : JSON.stringify(JSON.parse(content), null, 2);
                preview.textContent = formattedJson;
              } catch (e) {
                preview.textContent = content;
              }
            } else {
              // For text content
              preview.textContent = content;
            }

            fragmentDiv.appendChild(preview);
            previewBtn.textContent = "Hide Content";
          } catch (err) {
            console.error("Error loading fragment:", err);
            previewBtn.textContent = "Error loading preview";
          }
        };

        // Add conversion options for formats that support it
        if (fragment.formats && fragment.formats.length > 1) {
          const convertSection = document.createElement("div");
          convertSection.className = "convert-options";

          const convertLabel = document.createElement("span");
          convertLabel.textContent = "Convert to: ";
          convertSection.appendChild(convertLabel);

          // Create conversion links for each supported format
          fragment.formats.forEach((format) => {
            if (format !== fragment.type) {
              // Don't include the current format
              const ext = getExtensionForType(format);
              if (ext) {
                const convertLink = document.createElement("a");
                convertLink.href = "#";
                convertLink.textContent = ext;
                convertLink.onclick = async (e) => {
                  e.preventDefault();
                  try {
                    // Instead of opening a new window, download the converted fragment directly
                    const response = await fetch(
                      `${process.env.API_URL}/v1/fragments/${fragment.id}.${ext}`,
                      {
                        headers: {
                          Authorization: `Bearer ${user.idToken}`,
                        },
                      }
                    );

                    if (!response.ok) {
                      throw new Error(
                        `Conversion failed: ${response.status} ${response.statusText}`
                      );
                    }

                    // Get the content
                    const blob = await response.blob();

                    // Create a download link and click it
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `fragment-${fragment.id.substring(
                      0,
                      8
                    )}.${ext}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error(`Error converting to ${format}:`, err);
                    alert(`Error converting to ${ext}: ${err.message}`);
                  }
                };
                convertSection.appendChild(convertLink);
                convertSection.appendChild(document.createTextNode(" "));
              }
            }
          });

          fragmentDiv.appendChild(convertSection);
        }

        // Create actions section
        const actions = document.createElement("div");
        actions.className = "fragment-actions";
        actions.appendChild(previewBtn);

        // Add an edit button
        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.className = "edit-btn";
        editBtn.onclick = async () => {
          try {
            // First, get the current content
            const content = await getFragment(user, fragment.id);

            // Create edit modal/dialog
            const editDialog = document.createElement("div");
            editDialog.className = "edit-dialog";

            const editHeader = document.createElement("h4");
            editHeader.textContent = "Edit Fragment";
            editDialog.appendChild(editHeader);

            let editInput;

            // Different input types based on content
            if (fragment.type.startsWith("image/")) {
              // For images, we need to use a file input
              editInput = document.createElement("input");
              editInput.type = "file";
              editInput.accept = fragment.type;

              // Add preview of current image
              const currentImg = document.createElement("div");
              currentImg.className = "current-image";
              currentImg.innerHTML = "<p>Current image:</p>";

              const img = document.createElement("img");
              img.src = URL.createObjectURL(
                new Blob([content], { type: fragment.type })
              );
              img.alt = "Current fragment image";
              img.style.maxWidth = "100%";
              img.style.maxHeight = "200px";

              currentImg.appendChild(img);
              editDialog.appendChild(currentImg);
            } else {
              // For text content
              editInput = document.createElement("textarea");
              editInput.rows = 5;
              editInput.value =
                typeof content === "object"
                  ? JSON.stringify(content, null, 2)
                  : content;
            }

            editInput.className = "edit-input";
            editDialog.appendChild(editInput);

            // Add buttons container
            const buttonContainer = document.createElement("div");
            buttonContainer.className = "button-container";

            // Add cancel button
            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = "Cancel";
            cancelBtn.onclick = () => {
              // Remove the dialog
              document.body.removeChild(editDialog);
            };
            buttonContainer.appendChild(cancelBtn);

            // Add save button
            const saveBtn = document.createElement("button");
            saveBtn.textContent = "Save";
            saveBtn.onclick = async () => {
              try {
                saveBtn.textContent = "Saving...";
                saveBtn.disabled = true;

                let newContent;

                if (fragment.type.startsWith("image/")) {
                  // For images
                  if (!editInput.files || !editInput.files[0]) {
                    alert("Please select a new image file");
                    saveBtn.textContent = "Save";
                    saveBtn.disabled = false;
                    return;
                  }

                  // Read file as array buffer
                  newContent = await editInput.files[0].arrayBuffer();
                } else {
                  // For text content
                  newContent = editInput.value;
                }

                // Update the fragment
                await updateFragment(
                  user,
                  fragment.id,
                  newContent,
                  fragment.type
                );

                // Show success and refresh
                document.body.removeChild(editDialog);

                // Show temporary success message
                const successMsg = document.createElement("div");
                successMsg.className = "success-message";
                successMsg.textContent = "Fragment updated successfully!";
                fragmentsList.prepend(successMsg);

                // Remove success message after 3 seconds
                setTimeout(() => {
                  successMsg.remove();
                }, 3000);

                // Refresh the fragments list
                await displayFragments();
              } catch (err) {
                console.error("Error updating fragment:", err);
                alert(`Error updating fragment: ${err.message}`);
                saveBtn.textContent = "Save";
                saveBtn.disabled = false;
              }
            };
            buttonContainer.appendChild(saveBtn);

            editDialog.appendChild(buttonContainer);

            // Add to document
            document.body.appendChild(editDialog);

            // Position the dialog (center screen)
            editDialog.style.position = "fixed";
            editDialog.style.top = "50%";
            editDialog.style.left = "50%";
            editDialog.style.transform = "translate(-50%, -50%)";
          } catch (err) {
            console.error("Error preparing to edit fragment:", err);
            alert(`Error: ${err.message}`);
          }
        };

        actions.appendChild(editBtn);

        // Add a delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "delete-btn";
        deleteBtn.onclick = async () => {
          if (confirm(`Are you sure you want to delete this fragment?`)) {
            try {
              deleteBtn.textContent = "Deleting...";
              deleteBtn.disabled = true;

              await deleteFragment(user, fragment.id);

              // Remove from UI
              fragmentDiv.remove();

              // Show temporary success message
              const successMsg = document.createElement("div");
              successMsg.className = "success-message";
              successMsg.textContent = "Fragment deleted successfully!";
              fragmentsList.prepend(successMsg);

              // Remove success message after 3 seconds
              setTimeout(() => {
                successMsg.remove();
              }, 3000);
            } catch (err) {
              console.error("Error deleting fragment:", err);
              deleteBtn.textContent = "Delete";
              deleteBtn.disabled = false;
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

  // Helper function to get file extension from MIME type
  function getExtensionForType(mimeType) {
    const typeToExt = {
      "text/plain": "txt",
      "text/markdown": "md",
      "text/html": "html",
      "application/json": "json",
      "application/yaml": "yaml",
      "text/csv": "csv",
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/avif": "avif",
    };

    return typeToExt[mimeType] || null;
  }

  // Display any existing fragments on load
  await displayFragments();
}

// Wait for the DOM to be ready, then start the app
addEventListener("DOMContentLoaded", init);
