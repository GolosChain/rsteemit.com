const NL = "\n";
let textarea, result, processor;


export function convertTable(value) {

console.log(value)
  var content = value;
  var processor
  processor.innerHTML = content;

  console.log(processor)

  var tables = processor.getElementsByTagName('table');
  var markdownResults = '';
  if(tables) {

    for(i=0; i<tables.length; i++) {
      var tableElement = tables[i];
      var markdownTable = convertTableElementToMarkdown(tableElement);
      markdownResults += markdownTable + NL + NL;
    }
    reportResult(tables.length + ' tables found. ' + NL + NL + markdownResults);
  }
  else {
    reportResult('No table found');
  }
}

function reportResult(message) {
  result.innerHTML = message;
}

function convertTableElementToMarkdown(tableEl) {
  var rows = [];
  var trEls = tableEl.getElementsByTagName('tr');
  for(var i=0; i<trEls.length; i++) {
    var tableRow = trEls[i];
    var markdownRow = convertTableRowElementToMarkdown(tableRow, i);
    rows.push(markdownRow);
  }
  return rows.join(NL);
}

function convertTableRowElementToMarkdown(tableRowEl, rowNumber) {
  var cells = [];
  var cellEls = tableRowEl.children;
  for(var i=0; i<cellEls.length; i++) {
    var cell = cellEls[i];
    cells.push(cell.innerText + ' |');
  }
  var row = '| ' + cells.join(" ");

  if(rowNumber == 0) {
    row = row + NL + createMarkdownDividerRow(cellEls.length);
  }

  return row;
}

function createMarkdownDividerRow(cellCount) {
  var dividerCells = [];
  for(i = 0; i<cellCount; i++) {
    dividerCells.push('---' + ' |');
  }
  return '| ' + dividerCells.join(" ");
}
