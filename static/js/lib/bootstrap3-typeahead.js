/* =============================================================
 * bootstrap3-typeahead.js v3.0
 * https://github.com/chrisjohnson/Bootstrap-3-Typeahead
 * =============================================================
 * Original written by @mdo and @fat and @bassjobsen
 * Modifications by Chris Johnson
 * =============================================================
 * Copyright 2013 Bass Jobsen @bassjobsen
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ============================================================ */


!function($){

  "use strict"; // jshint ;_;


 /* TYPEAHEAD PUBLIC CLASS DEFINITION
  * ================================= */

  var Typeahead = function (element, options) {
    this.$element = $(element)
    this.options = $.extend({}, $.fn.typeahead.defaults, options)
    this.matcher = this.options.matcher || this.matcher
    this.filter = this.options.filter || this.filter
    this.sorter = this.options.sorter || this.sorter
    this.autoSelect = typeof this.options.autoSelect == 'boolean' ? this.options.autoSelect : true
    this.highlighter = this.options.highlighter || this.highlighter
    this.updater = this.options.updater || this.updater
    this.source = this.options.source
    this.$menu = $(this.options.menu)
    this.shown = false
    this.listen(),
    this.showHintOnFocus = typeof this.options.showHintOnFocus == 'boolean' ? this.options.showHintOnFocus : false;
    if (typeof this.options.source == 'string') {
      try {
        // Try parsing the source
        JSON.parse(this.options.source);
      } catch (e) {
        if (typeof this.options.source == 'string') {
          // They specified a URL to perform an ajax search
          this.source = this.ajaxSearch
          this.url = this.options.source
        }
      }
    }
    this.$element.attr("data-text",this.value).attr("autocomplete","off")
    var self = this;
    this.$element.on("seturl.typeahead", function(e, url) { // A method for updating the typeahead URL (since just changing data-source won't do it)
      self.source = self.ajaxSearch
      self.url = url;
      $(this).attr('data-source', url);
      $(this).data('source', url);
    });
  }

  Typeahead.prototype = {

    constructor: Typeahead
	
  , select: function () {
      var active = this.$menu.find('.active')
      var val = active.attr('data-value')
      if(this.autoSelect || val) {
        var text = val
        if (active.attr('data-text')) {
          text = active.attr('data-text')
        }
        this.$element
          .val(this.updater(text))
          .attr('data-value', val)
          .attr('data-text', text)
          .change()
		  .trigger('select.typeahead')
      }
      return this.hide()
    }

  , updater: function (item) {
      return item
    }

  , setSource: function (source) {
      this.source = source;
    }	

  , setUrl: function (url) {
      this.url = url;
    }	

  , show: function () {
      var pos = $.extend({}, this.$element.position(), {
        height: this.$element[0].offsetHeight
      }), scrollHeight
      
      scrollHeight = typeof this.options.scrollHeight == 'function' ?
          this.options.scrollHeight.call() :
          this.options.scrollHeight

      this.$menu
        .insertAfter(this.$element)
        .css({
          top: pos.top + pos.height + scrollHeight
        , left: pos.left
        })
        .show()

      this.shown = true
      return this
    }

  , hide: function () {
      this.$menu.hide()
      this.shown = false
      return this
    }

  , lookup: function (query) {
      var items      
	  if (typeof(query) != 'undefined' && query != null) {
		this.query = query;
	  } else {
		this.query = this.$element.val() ||  '';
	  }

      if (this.query.length < this.options.minLength) {
        return this.shown ? this.hide() : this
      }

      items = $.isFunction(this.source) ? this.source(this.query, $.proxy(this.process, this)) : this.source

      return items ? this.process(items) : this
    }

  , process: function (items) {
      var that = this

      if (!(items instanceof Array)) {
        // It's an object, not an array, grep manually
        items = that.grepObject(items, function(item) {
          return that.matcher(item);
        });

        if (that.filter) {
          if (!that.values(items).length) {
            return this.shown ? this.hide() : this;
          }
        }
        if (this.options.items == 'all' || this.options.minLength == 0 && !this.$element.val()) {
          return this.render(items).show()
        } else {
          return this.render(that.sliceObject(items, 0, this.options.items)).show()
        }
      } else {
        if (that.filter) {
          items = $.grep(items, function (item) {
            return that.matcher(item)
          })
        }
        if (!items.length) {
          return this.shown ? this.hide() : this;
        }
        items = this.sorter(items)
        if (this.options.items == 'all' || this.options.minLength == 0 && !this.$element.val()) {
          return this.render(items).show()
        } else {
          return this.render(items.slice(0, this.options.items)).show()
        }
      }

    }

  , matcher: function (item) {
      return ~item.toLowerCase().indexOf(this.query.toLowerCase())
    }

  , sorter: function (items) {
      var beginswith = []
        , caseSensitive = []
        , caseInsensitive = []
        , item

      while (item = items.shift()) {
        if (!item.toLowerCase().indexOf(this.query.toLowerCase())) beginswith.push(item)
        else if (~item.indexOf(this.query)) caseSensitive.push(item)
        else caseInsensitive.push(item)
      }

      return beginswith.concat(caseSensitive, caseInsensitive)
    }

  , highlighter: function (item) {
      var query = this.query.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&')
      return item.replace(new RegExp('(' + query + ')', 'ig'), function ($1, match) {
        return '<strong>' + match + '</strong>'
      })
    }

  , render: function (items) {
      var that = this

      items = $($.map(items, function (item, i) {
        var label = item.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#039;/g, "'");
        i = $(that.options.item).attr('data-value', (items instanceof Array) ? item : i).attr('data-text', label)
        i.find('a').html(that.highlighter(item))
        return i[0]
      }))

      if (this.autoSelect) {
        items.first().addClass('active')
      }
      this.$menu.html(items)
      return this
    }

  , next: function (event) {
      var active = this.$menu.find('.active').removeClass('active')
        , next = active.next()

      if (!next.length) {
        next = $(this.$menu.find('li')[0])
      }

      next.addClass('active')
    }

  , prev: function (event) {
      var active = this.$menu.find('.active').removeClass('active')
        , prev = active.prev()

      if (!prev.length) {
        prev = this.$menu.find('li').last()
      }

      prev.addClass('active')
    }

  , listen: function () {
      this.$element
        .on('focus',    $.proxy(this.focus, this))
        .on('blur',     $.proxy(this.blur, this))
        .on('keypress', $.proxy(this.keypress, this))
        .on('keyup',    $.proxy(this.keyup, this))
        .on('change',   $.proxy(this.change, this))

      if (this.eventSupported('keydown')) {
        this.$element.on('keydown', $.proxy(this.keydown, this))
      }

      this.$menu
        .on('click', $.proxy(this.click, this))
        .on('mouseenter', 'li', $.proxy(this.mouseenter, this))
        .on('mouseleave', 'li', $.proxy(this.mouseleave, this))
    }

  , eventSupported: function(eventName) {
      var isSupported = eventName in this.$element
      if (!isSupported) {
        this.$element.setAttribute(eventName, 'return;')
        isSupported = typeof this.$element[eventName] === 'function'
      }
      return isSupported
    }

  , move: function (e) {
      if (!this.shown) return

      switch(e.keyCode) {
        case 9: // tab
        case 13: // enter
        case 27: // escape
          e.preventDefault()
          break

        case 38: // up arrow
          e.preventDefault()
          this.prev()
          break

        case 40: // down arrow
          e.preventDefault()
          this.next()
          break
      }

      e.stopPropagation()
    }

  , keydown: function (e) {
      this.suppressKeyPressRepeat = ~$.inArray(e.keyCode, [40,38,9,13,27]);
	  if (!this.shown && e.keyCode == 40) {
		this.lookup("");
	  } else {
		this.move(e)
	  }
    }

  , keypress: function (e) {
      if (this.suppressKeyPressRepeat) return
      this.move(e)
    }

  , keyup: function (e) {
      switch(e.keyCode) {  
		case 40: // down arrow      
        case 38: // up arrow
        case 16: // shift
        case 17: // ctrl
        case 18: // alt
          break

        case 9: // tab
        case 13: // enter
          if (!this.shown) return
          this.select()
          break

        case 27: // escape
          if (!this.shown) return
          this.hide()
          break		
        default:
          this.lookup()
      }

      e.stopPropagation()
      e.preventDefault()
  }

  , change: function (e) {
  		if (this.$element.val() != this.$element.attr('data-text')) {
			// Text changed from the selected value, remove data-value and data-text
			this.$element.attr('data-value', '').attr('data-text', '').data('data-value', '').data('data-text', '');
			this.$element.trigger("deselect.typeahead");
		}
	}

  , focus: function (e) {
	  if (!this.focused) {
		  this.focused = true
		  if (this.options.minLength == 0 && !this.$element.val() || this.options.showHintOnFocus) {
			this.lookup(); 
		  }
	  }
    }

  , blur: function (e) {
      this.focused = false
      if (!this.mousedover && this.shown) this.hide()
    }

  , click: function (e) {
      e.stopPropagation()
      e.preventDefault()
      this.select()
      this.$element.focus()
    }

  , mouseenter: function (e) {
      this.mousedover = true
      this.$menu.find('.active').removeClass('active')
      $(e.currentTarget).addClass('active')
    }

  , mouseleave: function (e) {
      this.mousedover = false
      if (!this.focused && this.shown) this.hide()
    }

  , ajaxSearch: function (q, callback) {
      var self = this;
      if (self.ajaxTimeout) {
        clearTimeout(self.ajaxTimeout);
      }
      self.ajaxTimeout = setTimeout(function() {
        if (self.ajaxTimeout) {
          clearTimeout(self.ajaxTimeout);
        }

        if (q === "") {
          self.hide();
          return;
        }

        $.get(self.url, {q: q, limit: self.options.items}, function(data) {
          if (typeof data == "string") {
            data = JSON.parse(data);
          }
          callback(data);
        });
      }, self.options.ajaxdelay);
    }

  , values: function(obj) {
      var values = [];
      for ( var key in obj) {
        if (obj.hasOwnProperty(key)) {
          values.push(obj[key]);
        }
      }
      return values;
    }

  , grepObject: function(obj, method) {
      var values = {};
      for ( var key in obj ) {
        if (obj.hasOwnProperty(key)) {
          if (method(obj[key])) {
            values[key] = obj[key];
          }
        }
      }
      return values;
    }

  , sliceObject: function(obj, start, end) {
      var values = {};
      var i = 0;
      for ( var key in obj ) {
        if (obj.hasOwnProperty(key)) {
          if (i >= start && i < end) {
            values[key] = obj[key];
          }
          i++;
        }
      }
      return values;
    }

  }


  /* TYPEAHEAD PLUGIN DEFINITION
   * =========================== */

  var old = $.fn.typeahead

  $.fn.typeahead = function (option) {
	var arg = arguments;
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('typeahead')
        , options = typeof option == 'object' && option
      if (!data) $this.data('typeahead', (data = new Typeahead(this, options)))
      if (typeof option == 'string') {
		if (arg.length > 1) {
			data[option].apply(data, Array.prototype.slice.call(arg ,1));
		} else {
			data[option]()
		}
	  }
    })
  }

  $.fn.typeahead.defaults = {
    source: []
  , items: 8
  , menu: '<ul class="typeahead dropdown-menu"></ul>'
  , item: '<li><a href="#"></a></li>'
  , minLength: 1
  , scrollHeight: 0
  , autoSelect: true
  , filter: false
  }

  $.fn.typeahead.Constructor = Typeahead


 /* TYPEAHEAD NO CONFLICT
  * =================== */

  $.fn.typeahead.noConflict = function () {
    $.fn.typeahead = old
    return this
  }


 /* TYPEAHEAD DATA-API
  * ================== */

  $(document).on('focus.typeahead.data-api', '[data-provide="typeahead"]', function (e) {
    var $this = $(this)
    if ($this.data('typeahead')) return
    $this.typeahead($this.data())
  })

}(window.jQuery);
