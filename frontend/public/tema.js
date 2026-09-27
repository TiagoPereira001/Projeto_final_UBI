// corre antes de a página ser desenhada: aplica o tema escolhido neste
// dispositivo (claro ou escuro). Sem escolha, segue o sistema.
try {
  var tema = localStorage.getItem('bancada:tema');
  if (tema === 'claro' || tema === 'escuro') document.documentElement.dataset.tema = tema;
} catch (e) {
  // sem armazenamento disponível: fica o tema do sistema
}
