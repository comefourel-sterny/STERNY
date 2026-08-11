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
//
// PIEGE DE LA DUPLICATION (ajoute le 2026-08-11) : FORM_ID est en dur et le
// script lit par openById, pas par getActiveForm. Execute depuis l'editeur
// d'une COPIE du formulaire sans que FORM_ID ait ete change, il dumpe
// l'ORIGINAL et rien ne le signale. Le dump imprime donc en tete l'identifiant
// et le titre du formulaire reellement lu. VERIFIER CET EN-TETE EN PREMIER.
//
// LIMITE DE LA METHODE (ajoutee le 2026-08-11) : le dump signale qu'une option
// "Autre" est activee mais ne dit JAMAIS vers quelle section elle redirige.
// L'API ne l'expose pas de facon lisible. Cette verification reste MANUELLE,
// question par question, dans l'interface. Le dump ne couvre pas tout.

function dumpStructure() {
  var FORM_ID = '1dYJGW1h83h5fHEhwRFmjs68j4r03gepOVzQF5PjHPvg';
  var form = FormApp.openById(FORM_ID);
  var items = form.getItems();
  var i, k;

  var sectionOf = {}, titres = { 1: form.getTitle() }, aides = { 1: form.getDescription() }, num = 1;
  for (i = 0; i < items.length; i++) {
    if (items[i].getType() == FormApp.ItemType.PAGE_BREAK) {
      num++;
      sectionOf[items[i].getId()] = num;
      titres[num] = items[i].asPageBreakItem().getTitle();
      aides[num] = items[i].asPageBreakItem().getHelpText();
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

  function obligatoire(it) {
    var t = it.getType(), T = FormApp.ItemType;
    try {
      if (t == T.TEXT) return it.asTextItem().isRequired();
      if (t == T.PARAGRAPH_TEXT) return it.asParagraphTextItem().isRequired();
      if (t == T.MULTIPLE_CHOICE) return it.asMultipleChoiceItem().isRequired();
      if (t == T.CHECKBOX) return it.asCheckboxItem().isRequired();
      if (t == T.LIST) return it.asListItem().isRequired();
      if (t == T.SCALE) return it.asScaleItem().isRequired();
      if (t == T.DATE) return it.asDateItem().isRequired();
      if (t == T.TIME) return it.asTimeItem().isRequired();
      if (t == T.GRID) return it.asGridItem().isRequired();
      if (t == T.CHECKBOX_GRID) return it.asCheckboxGridItem().isRequired();
    } catch (e) { return null; }
    return null;
  }

  var sortie = {};
  for (i = 0; i < items.length; i++) {
    if (items[i].getType() == FormApp.ItemType.PAGE_BREAK) {
      var pb = items[i].asPageBreakItem();
      sortie[sectionOf[items[i].getId()] - 1] = cible(pb.getGoToPage(), pb.getPageNavigationType());
    }
  }
  sortie[total] = 'ENVOYER LE FORMULAIRE (fin)';

  var out = [];
  out.push('FORMULAIRE LU : ' + form.getTitle());
  out.push('FORM_ID       : ' + FORM_ID);
  out.push('DUMP GENERE   : ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'));
  out.push('');
  out.push('TOTAL SECTIONS : ' + total);
  out.push('');
  out.push('=== SECTION 1 : ' + titres[1] + ' ===');
  if (aides[1]) out.push('  [description de section] ' + aides[1]);

  var courante = 1;

  for (i = 0; i < items.length; i++) {
    var it = items[i], type = it.getType();

    if (type == FormApp.ItemType.PAGE_BREAK) {
      out.push('  >>> APRES LA SECTION ' + courante + ' : ' + sortie[courante]);
      courante = sectionOf[it.getId()];
      out.push('');
      out.push('=== SECTION ' + courante + ' : ' + titres[courante] + ' ===');
      if (aides[courante]) out.push('  [description de section] ' + aides[courante]);
      continue;
    }

    var req = obligatoire(it);
    var marque = (req === true) ? ' [OBLIGATOIRE]' : (req === false ? ' [facultatif]' : '');
    out.push('  Q [' + type + ']' + marque + ' ' + it.getTitle());

    var aide = it.getHelpText();
    if (aide) out.push('     [description] ' + aide);

    var ch = null;
    if (type == FormApp.ItemType.MULTIPLE_CHOICE) ch = it.asMultipleChoiceItem().getChoices();
    if (type == FormApp.ItemType.LIST) ch = it.asListItem().getChoices();
    if (ch) for (k = 0; k < ch.length; k++) {
      var n = ch[k].getPageNavigationType();
      out.push('     - ' + ch[k].getValue() + (n ? ('  -->  ' + cible(ch[k].getGotoPage(), n)) : ''));
    }
    if (type == FormApp.ItemType.MULTIPLE_CHOICE && it.asMultipleChoiceItem().hasOtherOption()) {
      out.push('     - [option Autre activee]');
    }

    if (type == FormApp.ItemType.CHECKBOX) {
      var cb = it.asCheckboxItem();
      var cc = cb.getChoices();
      for (k = 0; k < cc.length; k++) out.push('     - ' + cc[k].getValue());
      if (cb.hasOtherOption()) out.push('     - [option Autre activee]');
    }
  }
  out.push('  >>> APRES LA SECTION ' + courante + ' : ' + sortie[courante]);

  var buf = '';
  for (i = 0; i < out.length; i++) {
    if (buf && buf.length + out[i].length + 1 > 4000) { Logger.log(buf); buf = ''; }
    buf += (buf ? '\n' : '') + out[i];
  }
  if (buf) Logger.log(buf);
}
