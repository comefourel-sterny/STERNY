// Audit lecture seule du Google Form "Trouver un logement en alternance".
// Methode de reference depuis le 2026-08-10, remplace la verification visuelle.
// A coller dans l'editeur Apps Script du formulaire, puis Executer, puis lire
// le Journal d'execution. Aucune ecriture, aucun appel commencant par set.
//
// PIEGE DE L'API : le reglage de navigation porte par un PageBreakItem decrit
// la sortie de la section PRECEDENTE, pas celle qu'il ouvre. Ce script recale
// d'un cran. Point de controle : "APRES LA SECTION 7" doit afficher
// "SECTION 20 (Choix pro)". Si ce n'est pas le cas, le dump est decale et
// toute conclusion tiree dessus est fausse.

function dumpStructure() {
  var FORM_ID = '1dYJGW1h83h5fHEhwRFmjs68j4r03gepOVzQF5PjHPvg';
  var form = FormApp.openById(FORM_ID);
  var items = form.getItems();
  var i, k;

  var sectionOf = {}, titres = { 1: form.getTitle() }, num = 1;
  for (i = 0; i < items.length; i++) {
    if (items[i].getType() == FormApp.ItemType.PAGE_BREAK) {
      num++;
      sectionOf[items[i].getId()] = num;
      titres[num] = items[i].asPageBreakItem().getTitle();
    }
  }
  var total = num;

  function cible(page, nav) {
    if (nav == FormApp.PageNavigationType.SUBMIT) return 'ENVOYER LE FORMULAIRE';
    if (nav == FormApp.PageNavigationType.RESTART) return 'RECOMMENCER';
    if (!nav || nav == FormApp.PageNavigationType.CONTINUE) return 'section suivante';
    if (page) return 'SECTION ' + sectionOf[page.getId()] + ' (' + page.getTitle() + ')';
    return 'section suivante';
  }

  var sortie = {};
  for (i = 0; i < items.length; i++) {
    if (items[i].getType() == FormApp.ItemType.PAGE_BREAK) {
      var pb = items[i].asPageBreakItem();
      sortie[sectionOf[items[i].getId()] - 1] = cible(pb.getGoToPage(), pb.getPageNavigationType());
    }
  }
  sortie[total] = 'ENVOYER LE FORMULAIRE (fin)';

  var out = ['TOTAL SECTIONS : ' + total, '', '=== SECTION 1 : ' + titres[1] + ' ==='];
  var courante = 1;

  for (i = 0; i < items.length; i++) {
    var it = items[i], type = it.getType();

    if (type == FormApp.ItemType.PAGE_BREAK) {
      out.push('  >>> APRES LA SECTION ' + courante + ' : ' + sortie[courante]);
      courante = sectionOf[it.getId()];
      out.push('');
      out.push('=== SECTION ' + courante + ' : ' + titres[courante] + ' ===');
      continue;
    }

    out.push('  Q [' + type + '] ' + it.getTitle());
    var ch = null;
    if (type == FormApp.ItemType.MULTIPLE_CHOICE) ch = it.asMultipleChoiceItem().getChoices();
    if (type == FormApp.ItemType.LIST) ch = it.asListItem().getChoices();
    if (ch) for (k = 0; k < ch.length; k++) {
      var n = ch[k].getPageNavigationType();
      out.push('     - ' + ch[k].getValue() + (n ? ('  -->  ' + cible(ch[k].getGotoPage(), n)) : ''));
    }
  }
  out.push('  >>> APRES LA SECTION ' + courante + ' : ' + sortie[courante]);

  var t = out.join('\n');
  for (var p = 0; p < t.length; p += 4000) Logger.log(t.substring(p, p + 4000));
}
