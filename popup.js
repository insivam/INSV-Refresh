const queueList = document.getElementById("queue-list");
const addQueueBtn = document.getElementById("add-queue-btn");
const statusSpan = document.getElementById("status");
const soundSelect = document.getElementById("ddlSound");
const volumeSlider = document.getElementById("volumeSlider");

function createQueueElement(queue) {
  const isFirst = queueList.children.length === 0;
  const div = document.createElement("div");
  div.className = "queue-item";

  div.innerHTML = `
        <div class="drag-handle" title="Arrastar para reordenar">☰</div>
        <div class="adjustments-containers-1-and-2">
            <div class="container-1">
                <input type="text" placeholder="Nome da fila" value="${
                  queue.name || ""
                }" class="queue-name">
                <label class="active-toggle">
                    <button class="${
                      queue.active ? "queue-active" : "queue-inactive"
                    }">${queue.active ? "Ativo" : "Inativo"}</button>
                </label>
            </div>
            <div class="container-2">
                <div class="input-wrapper">
                    <input type="number" class="queue-interval" value="${
                      queue.interval || 15
                    }" min="5" max="900">
                    <span class="seconds">s</span>
                </div>
                <label>
                <button class="queue-sound has-tooltip ${
                  queue.soundEnabled ? "" : "off"
                }" data-tooltip="Notificar novos chamados">
                    <img src="./assets/icons/notification.png" alt="Icone de notificação">
                </button>
                </label>
                ${
                  isFirst
                    ? ""
                    : `<button class="delete-queue has-tooltip" data-tooltip="Remover fila"><img src="./assets/icons/trash-bin.png" alt="Remover"></button>`
                }
            </div>
        </div>
    `;

  if (!isFirst) {
    const deleteBtn = div.querySelector(".delete-queue");
    deleteBtn.addEventListener("click", () => {
      div.remove();
      saveOptions();
      updateAddButtonStyle();
      updateDeleteButtonStyle();
    });
  } else {
    div.setAttribute("draggable", "false");
  }

  div.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", saveOptions);
    input.addEventListener("change", saveOptions);
  });

  if (!isFirst) {
    div.setAttribute("draggable", "true");

    div.addEventListener("dragstart", (e) => {
      div.classList.add("dragging");
    });

    div.addEventListener("dragend", () => {
      div.classList.remove("dragging");
      saveOptions();
      updateDeleteButtonStyle();
    });
  }

  const activeBtn = div.querySelector(".active-toggle button");
  activeBtn.addEventListener("click", () => {
    const isActive = activeBtn.classList.contains("queue-active");
    activeBtn.classList.toggle("queue-active", !isActive);
    activeBtn.classList.toggle("queue-inactive", isActive);
    activeBtn.textContent = isActive ? "Inativo" : "Ativo";
    saveOptions();
  });

  const soundBtn = div.querySelector(".queue-sound");
  soundBtn.addEventListener("click", () => {
    soundBtn.classList.toggle("off");
    if (!soundBtn.classList.contains("off")) {
      playTestSound();
    }
    saveOptions();
  });

  return div;
}

function saveOptions() {
  const queues = [];
  queueList.querySelectorAll(".queue-item").forEach((item) => {
    queues.push({
      name: item.querySelector(".queue-name").value,
      active: item.querySelector(".queue-active") !== null,
      interval: parseInt(item.querySelector(".queue-interval").value, 10),
      soundEnabled: !item
        .querySelector(".queue-sound")
        .classList.contains("off"),
    });
  });

  const general = {
    notificationSound: soundSelect.value,
    volume: parseInt(volumeSlider.value, 10) / 100,
  };

  chrome.storage.local.set({ queues, general }, () => {
    statusSpan.textContent = "Salvando configurações...";
    setTimeout(() => (statusSpan.textContent = ""), 1800);
  });
}

function restoreOptions() {
  chrome.storage.local.get(["queues", "general"], (data) => {
    let queues = data.queues || [];

    if (queues.length === 0) {
      queues = [
        {
          name: "",
          active: true,
          interval: 15,
          soundEnabled: false,
        },
      ];
      chrome.storage.local.set({ queues });
    }

    queueList.innerHTML = "";
    queues.forEach((queue) => {
      const el = createQueueElement(queue);
      queueList.appendChild(el);
    });

    const general = data.general || {
      notificationSound: "notification.mp3",
      volume: 0.5,
    };
    soundSelect.value = general.notificationSound;
    volumeSlider.value = general.volume * 100;
    updateAddButtonStyle();
    updateDeleteButtonStyle();
  });
}

addQueueBtn.addEventListener("click", () => {
  const newQueue = {
    name: "",
    active: true,
    interval: 15,
    soundEnabled: false,
  };
  const el = createQueueElement(newQueue);
  queueList.appendChild(el);
  saveOptions();
  updateAddButtonStyle();
  updateDeleteButtonStyle();
});

function updateAddButtonStyle() {
  const queueItems = document.querySelectorAll(".queue-item");
  const addBtn = document.getElementById("add-queue-btn");

  if (queueItems.length <= 1) {
    addBtn.classList.add("centralizado-add-button");
  } else {
    addBtn.classList.remove("centralizado-add-button");
  }
}

function updateDeleteButtonStyle() {
  const queueItems = document.querySelectorAll(".queue-item");
  const total = queueItems.length;

  queueItems.forEach((item, index) => {
    const deleteBtn = item.querySelector(".delete-queue");

    if (!deleteBtn) return;

    deleteBtn.classList.remove("centralizado-delete-button");

    if (index !== total - 1) {
      deleteBtn.classList.add("centralizado-delete-button");
    }
  });
}

function playTestSound() {
  const audio = new Audio(`./assets/sounds/${soundSelect.value}`);
  audio.volume = parseInt(volumeSlider.value, 10) / 100;
  audio.play();
}

soundSelect.addEventListener("change", () => {
  playTestSound();
  saveOptions();
});

volumeSlider.addEventListener("mouseup", () => {
  playTestSound();
  saveOptions();
});

document.addEventListener("DOMContentLoaded", restoreOptions);

queueList.addEventListener("dragover", (e) => {
  e.preventDefault();
  const dragging = document.querySelector(".dragging");
  if (!dragging) return;

  const afterElement = getDragAfterElement(queueList, e.clientY);
  const firstItem = queueList.querySelector(".queue-item");
  if (afterElement === firstItem || dragging === firstItem) return;

  if (afterElement == null) {
    queueList.appendChild(dragging);
  } else {
    queueList.insertBefore(dragging, afterElement);
  }
});

queueList.addEventListener("drop", () => {
  saveOptions();
});

function getDragAfterElement(container, y) {
  const draggableElements = [
    ...container.querySelectorAll(".queue-item:not(.dragging)"),
  ];

  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}
