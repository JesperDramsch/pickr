function filterTags(identifier,field,tagitem) {
    switch (identifier) {
// Add All Tags show images if pickstyle matches
      case 'addAll' :
        for ( var j = 0; j < tags.length; j++) {
          $(field).tagsinput('add',tags[j]);
        }
      break;
// Show image if pickstyle matches
      case 'add' :
        var not_class = '';
        if (!swLines || !swPolygon || !swPoints) {
            var not_class = ':not(';
            if (!swLines) {
                not_class += '.lines';
                if (!swPolygon || !swPoints) {
                    not_class += ',';
                }
            }
            if (!swPolygon) {
                not_class += '.polygon';
                if (!swPoints) {
                    not_class += ',';
                }
            }
            if (!swPoints) {
                not_class += '.points';
            }
            not_class += ')';
        }
        var tagavail = $(field).tagsinput('items');
        for ( var j = 0; j < tagavail.length; j++) {
            $('.imgtag-'+tagavail[j].value+not_class).show(anim_delay);
         }
      break;
// Purge images
      case 'removeAll':
        for ( var j = 0; j < tags.length; j++) {
            $('.imgtag-'+j).hide(anim_delay);
        }
        $(field).tagsinput('removeAll');
      break;
// Remove particular image
      case 'remove':
            $('.imgtag-'+tagitem).hide(anim_delay);
      break;
// Toggle Line Pickstyle
      case 'toggleLines':
        swLines = !swLines;
        if ( swLines ) {
            $('.lines').show(anim_delay);
        } else {
            $('.lines').hide(anim_delay);
        }
      break;
// Toggle Polygon Pickstyle
      case 'togglePolygon':
        swPolygon = !swPolygon;
        if ( swPolygon ) {
            $('.polygon').show(anim_delay);
        } else {
            $('.polygon').hide(anim_delay);
        }
      break;
// Toggle Point Pickstyle
      case 'togglePoints':
        swPoints = !swPoints;
        if ( swPoints ) {
            $('.points').show(anim_delay);
        } else {
            $('.points').hide(anim_delay);
        }
      break;
    }
}