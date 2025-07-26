function validateAudioFile(input) {
  const file = input.files[0];
  if (!file) return;

  const validTypes = ["audio/mpeg", "audio/wav", "audio/ogg"];
  const maxSizeMB = 5;

  if (!validTypes.includes(file.type)) {
    alert("Formato inválido. Por favor, envie um arquivo MP3, WAV ou OGG.");
    input.value = "";
    return;
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    alert("Arquivo muito grande. O tamanho máximo permitido é 5MB.");
    input.value = "";
    return;
  }
}
