/**
 * =============================================================================
 * CHÁ DA LIVIA — Google Apps Script (RSVP → Google Sheets)
 * =============================================================================
 *
 * CONFIGURAÇÃO:
 * 1. Planilha → Extensões → Apps Script → cole este código → Salvar
 * 2. Executar `setupSheet` uma vez (autorizar permissões)
 * 3. Implantar → Aplicativo da Web → Executar como: Eu → Qualquer pessoa
 * 4. Copie a URL /exec para script.js
 * 5. Se já implantou antes: Implantar → Gerenciar → Editar → Nova versão
 *
 * Colunas: Nome | Acompanhantes | Comparecer | Telefone
 * =============================================================================
 */

const SPREADSHEET_ID = '';
const SHEET_NAME = 'Confirmações';
const HEADERS = ['Nome', 'Acompanhantes', 'Comparecer', 'Telefone'];

function setupSheet() {
  var sheet = getOrCreateSheet_();
  if (sheet.getLastRow() === 0) {
    writeHeaders_(sheet);
  }
  sheet.autoResizeColumns(1, HEADERS.length);
}

function doGet(e) {
  try {
    var params = getParams_(e);
    if (params.action === 'save' || params.nome) {
      return saveRsvp_(params);
    }
    return jsonResponse_({ status: 'ok', message: 'Web App do Chá da Livia ativo.' });
  } catch (err) {
    return jsonResponse_({ success: false, message: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    return saveRsvp_(parseRequestData_(e));
  } catch (err) {
    return jsonResponse_({ success: false, message: String(err.message || err) });
  }
}

function saveRsvp_(data) {
  if (!sanitize_(data.nome)) {
    throw new Error('Nome é obrigatório.');
  }

  var sheet = getOrCreateSheet_();
  ensureHeaders_(sheet);

  sheet.appendRow([
    sanitize_(data.nome),
    sanitize_(data.acompanhantes),
    sanitize_(data.comparecer),
    sanitize_(data.telefone),
  ]);

  return jsonResponse_({ success: true });
}

function getParams_(e) {
  e = e || {};
  return e.parameter || {};
}

function getOrCreateSheet_() {
  var ss = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) {
    throw new Error('Planilha não encontrada. Vincule o script à planilha.');
  }

  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  return sheet;
}

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    writeHeaders_(sheet);
  }
}

function writeHeaders_(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#FCE7F0')
    .setFontColor('#D4739A');
  sheet.setFrozenRows(1);
}

function sanitize_(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function parseRequestData_(e) {
  if (!e) {
    throw new Error('Requisição vazia.');
  }

  if (e.parameter && e.parameter.nome) {
    return e.parameter;
  }

  if (e.postData && e.postData.contents) {
    var type = (e.postData.type || '').toLowerCase();

    if (type.indexOf('application/json') !== -1) {
      return JSON.parse(e.postData.contents);
    }

    var data = {};
    var pairs = e.postData.contents.split('&');
    for (var i = 0; i < pairs.length; i++) {
      var parts = pairs[i].split('=');
      var key = decodeURIComponent(parts[0] || '');
      var val = decodeURIComponent((parts[1] || '').replace(/\+/g, ' '));
      if (key) data[key] = val;
    }
    if (data.nome) return data;
  }

  throw new Error('Dados do formulário não recebidos.');
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
