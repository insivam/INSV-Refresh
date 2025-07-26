window.onload = function () {
  console.log("[Debug] GRID REFRESH ATIVADO");
  let audioEnabled = false;

  document.addEventListener(
    "click",
    () => {
      audioEnabled = true;
      console.log("[Debug] Som ativado após clique");
    },
    { once: true }
  );

  function isRightQueue(queueName) {
    const title = document.querySelector(".slds-page-header__title");
    return title && title.innerText.toLowerCase().trim() === queueName.toLowerCase().trim();
  }

  function getNewCaseIds(seenCaseIds) {
    const caseLinks = document.querySelectorAll(
      'table[role="grid"] tbody tr th span a'
    );
    const newIds = [];

    caseLinks.forEach((link) => {
      const caseId = link.textContent.trim();
      if (!seenCaseIds.has(caseId)) {
        newIds.push(caseId);
      }
    });

    return newIds;
  }

  function tocarSom(soundName, volume) {
    if (!audioEnabled) {
      console.log("[Debug] Audio desabilitado, clique na tela");
      return;
    }

    chrome.storage.local.get('audiosPersonalizados', (data) => {
      const customAudios = data.audiosPersonalizados || {};
      let audioSrc;

      if (customAudios[soundName]) {
        audioSrc = customAudios[soundName];
      } else {
        audioSrc = chrome.runtime.getURL("assets/sounds/" + soundName);
      }

      const audio = new Audio(audioSrc);
      audio.volume = volume;
      audio.play().catch(e => console.error("Erro ao tocar o som:", e));
    });
  }

  const filaMonitores = new Map();

  function iniciarMonitoramentoFila(fila, globalSound, globalVolume) {
    let seenCaseIds = new Set();

    const loop = () => {
      if (!isRightQueue(fila.name)) {
        console.log(`[Debug] Retornando, fila incorreta: ${fila.name}`);
        return;
      }

      const userIsEditing = document.querySelector(
        ".main-content .slds-checkbox [type=checkbox]:checked"
      );

      if (!userIsEditing) {
        console.log(`[Debug] Executando refresh da fila: "${fila.name}"`);
        const el = document.querySelector('button[name="refreshButton"]');
        if (el) el.click();
      } else {
        console.log(
          "[Debug] Ignorou refresh - usuário está com chamado selecionado"
        );
      }

      setTimeout(() => {
        const novos = getNewCaseIds(seenCaseIds);

        if (novos.length > 0 && fila.soundEnabled) {
          console.log(`[Debug] Novos casos: "${novos}"`);
          tocarSom(globalSound, globalVolume);
        }

        novos.forEach((id) => seenCaseIds.add(id));
      }, 1500);
    };
    const intervalo = setInterval(loop, (fila.interval || 15) * 1000);
    filaMonitores.set(fila.name, intervalo);
  }

  function pararMonitoramentosAtuais() {
    filaMonitores.forEach((intervalId, nomeFila) => {
      clearInterval(intervalId);
      console.log(`[Debug] Parando monitoramento da fila: ${nomeFila}`);
    });
    filaMonitores.clear();
  }

  function carregarEIniciarTodos() {
    chrome.storage.local.get(["queues", "general"], (data) => {
      const filas = (data.queues || []).filter((q) => q.active);
      const sound =
        (data.general && data.general.notificationSound) || "notification.mp3";
      const volume = (data.general && data.general.volume) || 0.5;

      pararMonitoramentosAtuais();

      filas.forEach((fila) => {
        if (fila.name) {
          console.log(
            `[Debug] Iniciando monitoramento da fila: "${fila.name}"`
          );
          iniciarMonitoramentoFila(fila, sound, volume);
        }
      });
    });
  }

  carregarEIniciarTodos();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.queues || changes.general)) {
      console.log(
        "[Debug] Alterações detectadas no storage. Reiniciando monitoramento..."
      );
      carregarEIniciarTodos();
    }
  });
};
