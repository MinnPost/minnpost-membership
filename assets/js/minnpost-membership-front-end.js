"use strict";

// plugin
;

(function ($, window, document) {
  // Create the defaults once
  var pluginName = 'minnpostAmountSelect',
      defaults = {
    frequencySelector: '.m-frequency-select input[type="radio"]',
    amountSelector: '.m-amount-select input[type="radio"]',
    amountLabels: '.m-amount-select label',
    amountValue: 'strong',
    amountDescription: '.a-amount-description',
    amountField: '.a-amount-field #amount'
  }; // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element; // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin

    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  } // end constructor


  Plugin.prototype = {
    init: function init() {
      var frequencies = $(this.element).find(this.options.frequencySelector);
      var amounts = $(this.options.amountSelector);
      var amount = $(this.element).find(this.options.amountField);
      this.setAmountLabels(frequencies.filter(':checked').val());
      frequencies.change(this.onFrequencyChange.bind(this));
      amounts.on('change', this.clearAmountField.bind(this));
      amount.on('keyup mouseup', this.clearAmountSelector.bind(this));
    },
    onFrequencyChange: function onFrequencyChange(event) {
      this.setAmountLabels($(event.target).val());
    },
    setAmountLabels: function setAmountLabels(frequencyString) {
      var amountElement = this.options.amountValue;
      var descElement = this.options.amountDescription;
      var labels = $(this.options.amountLabels);
      var typeAndFrequency;
      var type;
      var frequency;

      if (labels.length < 0 || typeof frequencyString === 'undefined') {
        return;
      }

      typeAndFrequency = frequencyString.split(' - ');
      type = typeAndFrequency[0];
      frequency = parseInt(typeAndFrequency[1], 10);
      labels.each(function (index) {
        var $label = $(this);
        var amount = parseInt($('#' + $label.attr('for')).val(), 10);
        var amountText = '$' + (type === 'per year' ? amount * 12 : amount);
        var desc = $label.data(type === 'per year' ? 'yearly-desc' : 'monthly-desc');
        $(this).find(amountElement).text(amountText);
        $(this).find(descElement).text(desc);
      });
    },
    // end setAmountLabels
    clearAmountSelector: function clearAmountSelector(event) {
      var amounts = $(this.options.amountSelector);

      if ($(event.target).val() === '') {
        return;
      }

      amounts.removeAttr('checked');
    },
    clearAmountField: function clearAmountField(event) {
      $(this.element).find(this.options.amountField).val(null);
    }
  }; // end Plugin.prototype
  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document);
"use strict";

(function ($) {
  function benefitForm() {
    if (2 === performance.navigation.type) {
      location.reload(true);
    }

    $('.a-benefit-button.a-button-disabled').removeAttr('disabled');
    $('.a-benefit-button').click(function (event) {
      event.preventDefault();
      var $button = $(this);
      var $status = $('.m-benefit-message', $(this).parent());
      var $select = $('select', $(this).parent());
      var settings = minnpost_membership_settings; // reset the message for current status

      if (!'.m-benefit-message-success') {
        $('.m-benefit-message').removeClass('m-benefit-message-visible m-benefit-message-error m-benefit-message-info');
      } // set button to processing


      $button.text('Processing').addClass('a-button-disabled'); // disable all the other buttons

      $('.a-benefit-button').addClass('a-button-disabled'); // set ajax data

      var data = {};
      var benefitType = $('input[name="benefit-name"]').val();

      if ('partner-offers' === benefitType) {
        data = {
          'action': 'benefit_form_submit',
          'minnpost_membership_benefit_form_nonce': $button.data('benefit-nonce'),
          'current_url': $('input[name="current_url"]').val(),
          'benefit-name': $('input[name="benefit-name"]').val(),
          'instance_id': $('[name="instance-id-' + $button.val() + '"]').val(),
          'post_id': $button.val(),
          'is_ajax': '1'
        };
        $.post(settings.ajaxurl, data, function (response) {
          // success
          if (true === response.success) {
            //console.dir(response);
            $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
            $status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);

            if (0 < $select.length) {
              $select.prop('disabled', true);
            }

            $('.a-benefit-button').not($button).val(response.data.button_value).attr('disabled', true);
          } else {
            // error
            //console.dir(response);
            if ('undefined' === typeof response.data.remove_instance_value) {
              if ('' !== response.data.button_label) {
                $button.show();
                $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
              } else {
                $button.hide();
              }
            } else {
              $('option', $select).each(function (i) {
                if ($(this).val() === response.data.remove_instance_value) {
                  $(this).remove();
                }
              });

              if ('' !== response.data.button_label) {
                $button.show();
                $button.val(response.data.button_value).text(response.data.button_label).removeClass('a-button-disabled').addClass(response.data.button_class).prop(response.data.button_attr, true);
              } else {
                $button.hide();
              }
            } // re-enable all the other buttons


            $('.a-benefit-button').not($button).removeClass('a-button-disabled');
            $status.html(response.data.message).addClass('m-benefit-message-visible ' + response.data.message_class);
          }
        });
      }
    });
  }

  $(document).ready(function () {
    if (0 < $('.m-form-membership-benefit').length) {
      benefitForm();
    }
  });
  $('.a-refresh-page').click(function (event) {
    event.preventDefault();
    location.reload();
  });
})(jQuery);
"use strict";

(function ($) {
  function mp_membership_analytics_tracking_event(type, category, action, label, value) {
    if (typeof ga !== 'undefined') {
      if (typeof value === 'undefined') {
        ga('send', type, category, action, label);
      } else {
        ga('send', type, category, action, label, value);
      }
    } else {
      return;
    }
  }

  $(document).ready(function () {
    $('.m-support-cta-top .a-support-button').click(function (event) {
      var value = '';

      if ($('svg', $(this)).length > 0) {
        value = $('svg', $(this)).attr('title') + ' ';
      }

      value = value + $(this).text();
      mp_membership_analytics_tracking_event('event', 'Support CTA - Header', 'Click: ' + value, location.pathname);
    });
  });
})(jQuery);
"use strict";

// plugin
;

(function ($, window, document, undefined) {
  // Create the defaults once
  var pluginName = 'minnpostMembership',
      defaults = {
    'debug': false,
    // this can be set to true on page level options
    'amount_selector_standalone': '#amount-item #amount',
    'frequency_selector_standalone': '.m-membership-fast-select input[type="radio"]',
    'level_viewer_container': '.a-show-level',
    'level_name': '.a-level',
    'user_current_level': '.a-current-level',
    'user_new_level': '.a-new-level',
    'amount_viewer': '.amount h3',
    'frequency_selector_in_levels': '.a-form-item-membership-frequency',
    'frequency_selector_in_levels_type': 'select',
    'levels_container': '.o-membership-member-levels',
    'single_level_container': '.m-membership-member-level',
    'single_level_summary_selector': '.m-member-level-brief',
    'flipped_items': 'div.amount, div.enter',
    'level_frequency_text_selector': '.show-frequency',
    'choose_amount_selector_in_levels': '.amount .a-button-flip',
    'amount_selector_in_levels': '.enter input.amount-entry'
  }; // end defaults
  // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element; // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin

    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  } // end constructor


  Plugin.prototype = {
    init: function init(reset, amount) {
      // Place initialization logic here
      // You already have access to the DOM element and
      // the options via the instance, e.g. this.element
      // and this.options
      // you can add more functions like the one below and
      // call them like so: this.yourOtherFunction(this.element, this.options).
      this.catchHashLinks(this.element, this.options);
      this.levelFlipper(this.element, this.options);
      this.startLevelClick(this.element, this.options);
    },
    catchHashLinks: function catchHashLinks(element, options) {
      $('a[href*="#"]:not([href="#"])', element).click(function (e) {
        var target = $(e.target);

        if (target.parent('.comment-title').length == 0 && location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
          var target = $(this.hash);
          target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');

          if (target.length) {
            $('html,body').animate({
              scrollTop: target.offset().top
            }, 1000);
            return false;
          }
        }
      });
    },
    // end catchLinks
    levelFlipper: function levelFlipper(element, options) {
      var that = this;
      var previous_amount = '';
      var amount = 0;
      var level = '';
      var level_number = 0;
      var frequency_string = '';
      var frequency = '';
      var frequency_name = '';

      if (typeof minnpost_membership_data !== 'undefined' && $(options.user_current_level).length > 0) {
        previous_amount = minnpost_membership_data.current_user.previous_amount;
      }

      if ($(options.amount_selector_standalone).length > 0 && $(options.frequency_selector_standalone).length > 0) {
        amount = $(options.amount_selector_standalone).val();
        frequency_string = $(options.frequency_selector_standalone + ':checked').val();
        frequency = frequency_string.split(' - ')[1];
        frequency_name = frequency_string.split(' - ')[0];
        level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
        that.showNewLevel(element, options, level);
        $(options.frequency_selector_standalone).change(function () {
          frequency_string = $(options.frequency_selector_standalone + ':checked').val();
          frequency = frequency_string.split(' - ')[1];
          frequency_name = frequency_string.split(' - ')[0];
          level = that.checkLevel($(options.amount_selector_standalone).val(), $(options.frequency_selector_standalone + ':checked').attr('data-year-frequency'), frequency_name, previous_amount, element, options);
          that.showNewLevel(element, options, level);
        });
        $(options.amount_selector_standalone).bind('keyup mouseup', function () {
          frequency_string = $(options.frequency_selector_standalone + ':checked').val();
          frequency = frequency_string.split(' - ')[1];
          frequency_name = frequency_string.split(' - ')[0];

          if ($(this).data('last-value') != $(this).val()) {
            $(this).data('last-value', $(this).val());
            level = that.checkLevel($(options.amount_selector_standalone).val(), $(options.frequency_selector_standalone + ':checked').attr('data-year-frequency'), frequency_name, previous_amount, element, options);
            that.showNewLevel(element, options, level);
          }

          ;
        });
      }

      if ($(options.levels_container).length > 0) {
        $(options.single_level_summary_selector, element).each(function () {
          $(options.flipped_items, $(this)).wrapAll('<div class="flipper"/>');
        });
        $(options.frequency_selector_in_levels, element).on('change', function (event) {
          level_number = $(this).data('member-level-number');
          frequency_string = $(this).val();
          frequency = frequency_string.split(' - ')[1];
          frequency_name = frequency_string.split(' - ')[0];

          if (typeof level_number !== 'undefined') {
            $(options.single_level_summary_selector, element).removeClass('flipped');
            $(options.single_level_container, element).removeClass('active');
            $(event.target).closest(options.single_level_summary_selector).addClass('flipped');

            if (frequency == 1) {
              $(options.amount_selector_in_levels, $(options.single_level_container + '-' + level_number)).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-yearly'));
            } else if (frequency == 12) {
              $(options.amount_selector_in_levels, $(options.single_level_container + '-' + level_number)).val($(options.amount_viewer, $(options.single_level_container + '-' + level_number)).data('default-monthly'));
            }

            amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
            level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
            that.changeFrequency(frequency_string, level['name'], element, options);
          } else if ($(options.level_frequency_text_selector).length > 0) {
            $(options.level_frequency_text_selector, element).text(frequency_name);
            $(options.single_level_container).each(function () {
              level_number = $(options.amount_selector_in_levels, $(this)).data('member-level-number');

              if (typeof level_number !== 'undefined') {
                amount = $(options.amount_selector_in_levels, $(this)).val();
                level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
              }
            });
          }

          that.changeAmountPreview(frequency_string, level['name'], element, options);
        });
      }

      if ($(options.choose_amount_selector_in_levels).length > 0) {
        $(options.choose_amount_selector_in_levels, element).click(function (event) {
          level_number = $(options.frequency_selector_in_levels, element).data('member-level-number');
          $(options.single_level_summary_selector, element).removeClass('flipped');
          $(options.single_level_container, element).removeClass('active');
          $(event.target).closest(options.single_level_summary_selector).addClass('flipped');
          frequency_string = $(options.frequency_selector_in_levels, $(this).parent()).val();
          frequency = frequency_string.split(' - ')[1];
          amount = $(options.amount_selector_in_levels + '[data-member-level-number="' + level_number + '"]').val();
          level = that.checkLevel(amount, frequency, frequency_name, previous_amount, element, options);
          event.preventDefault();
        });
      }
    },
    // end levelFlipper
    checkLevel: function checkLevel(amount, frequency, type, previous_amount, element, options) {
      var thisyear = parseInt(amount) * parseInt(frequency);
      var level = '';

      if (typeof previous_amount !== 'undefined' && previous_amount !== '') {
        var prior_year_amount = parseInt(previous_amount.prior_year_contributions);
        var coming_year_amount = parseInt(previous_amount.coming_year_contributions);
        var annual_recurring_amount = parseInt(previous_amount.annual_recurring_amount); // calculate member level formula

        if (type === 'one-time') {
          prior_year_amount += thisyear;
        } else {
          annual_recurring_amount += thisyear;
        }

        thisyear = Math.max(prior_year_amount, coming_year_amount, annual_recurring_amount);
      }

      level = this.getLevel(thisyear);
      $('h2', options.single_level_summary_selector).each(function () {
        if ($(this).text() == level['name']) {
          $(options.single_level_container, element).removeClass('active');
          $(this).parent().parent().addClass('active');
        }
      });
      return level;
    },
    // end checkLevel
    getLevel: function getLevel(thisyear) {
      var level = [];

      if (thisyear > 0 && thisyear < 60) {
        level['name'] = 'Bronze';
        level['number'] = 1;
      } else if (thisyear > 59 && thisyear < 120) {
        level['name'] = 'Silver';
        level['number'] = 2;
      } else if (thisyear > 119 && thisyear < 240) {
        level['name'] = 'Gold';
        level['number'] = 3;
      } else if (thisyear > 239) {
        level['name'] = 'Platinum';
        level['number'] = 4;
      }

      return level;
    },
    // end getLevel
    showNewLevel: function showNewLevel(element, options, level) {
      var member_level_prefix = '';
      var old_level = '';
      var level_viewer_container_selector = options.level_viewer_container; // this should change when we replace the text, if there is a link inside it

      var decodeHtmlEntity = function decodeHtmlEntity(str) {
        return str.replace(/&#(\d+);/g, function (match, dec) {
          return String.fromCharCode(dec);
        });
      };

      if (typeof minnpost_membership_data !== 'undefined') {
        member_level_prefix = minnpost_membership_data.member_level_prefix;
      }

      if ($(options.level_viewer_container).length > 0) {
        $(options.level_viewer_container).prop('class', 'a-show-level a-show-level-' + level['name'].toLowerCase());

        if ($(options.user_current_level).length > 0 && minnpost_membership_data.current_user.member_level.length > 0) {
          if ('a', $(options.level_viewer_container).length > 0) {
            level_viewer_container_selector = options.level_viewer_container + ' a';
          }

          old_level = minnpost_membership_data.current_user.member_level.replace(member_level_prefix, '');

          if (old_level !== level['name'].toLowerCase()) {
            $(level_viewer_container_selector).html(decodeHtmlEntity($(options.level_viewer_container).data('changed')));
          } else {
            $(level_viewer_container_selector).html(decodeHtmlEntity($(options.level_viewer_container).data('not-changed')));
          }
        }

        $(options.level_name, options.level_viewer_container).text(level['name']);
      }
    },
    // end showNewLevel
    changeFrequency: function changeFrequency(selected, level, element, options) {
      $(options.single_level_summary_selector).each(function () {
        var range = $(options.amount_viewer, $(this)).text();
        var month_value = $(options.amount_viewer, $(this)).data('month');
        var year_value = $(options.amount_viewer, $(this)).data('year');
        var once_value = $(options.amount_viewer, $(this)).data('one-time');
        var frequency_name = selected.split(' - ')[0];
        var frequency = parseInt(selected.split(' - ')[1]);
        $(options.frequency_selector_in_levels).val(selected);
        $(options.frequency_selector_in_levels).prop('selected', selected);

        if (frequency_name == 'per month') {
          range = month_value;
          $(options.amount_viewer, $(this)).removeClass('smaller');
        } else if (frequency_name == 'per year') {
          range = year_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        } else if (frequency_name == 'one-time') {
          range = once_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        }

        $(options.amount_viewer, $(this)).text(range);
        $(options.frequency_selector_in_levels, $(this)).data('frequency', frequency);
      });
    },
    // end changeFrequency
    changeAmountPreview: function changeAmountPreview(selected, level, element, options) {
      $(options.single_level_summary_selector).each(function () {
        var range = $(options.amount_viewer, $(this)).text();
        var month_value = $(options.amount_viewer, $(this)).data('month');
        var year_value = $(options.amount_viewer, $(this)).data('year');
        var once_value = $(options.amount_viewer, $(this)).data('one-time');
        var frequency_name = selected.split(' - ')[0];

        if (frequency_name == 'per month') {
          range = month_value;
          $(options.amount_viewer, $(this)).removeClass('smaller');
        } else if (frequency_name == 'per year') {
          range = year_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        } else if (frequency_name == 'one-time') {
          range = once_value;
          $(options.amount_viewer, $(this)).addClass('smaller');
        }

        $(options.amount_viewer, $(this)).text(range);
      });
    },
    // end changeAmountPreview
    startLevelClick: function startLevelClick(element, options) {
      $('.start-level').click(function () {
        var level_class = $(this).prop('class');
        var level_number = level_class[level_class.length - 1];
        $(options.single_level_summary_selector, element).removeClass('flipped');
        $(options.single_level_container, element).removeClass('active');
        $(options.single_level_container + '-' + level_number, element).addClass('active');
        $(options.single_level_container + '-' + level_number + ' ' + options.single_level_summary_selector).addClass('flipped');
      });
    } // end startLevelClick

  }; // end Plugin.prototype
  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document);
"use strict";

// plugin
;

(function ($, window, document) {
  // Create the defaults once
  var pluginName = 'minnpostTrackSubmit',
      defaults = {
    type: 'event',
    category: 'Support Us',
    action: 'Become A Member',
    label: location.pathname
  }; // The actual plugin constructor

  function Plugin(element, options) {
    this.element = element; // jQuery has an extend method which merges the contents of two or
    // more objects, storing the result in the first object. The first object
    // is generally empty as we don't want to alter the default options for
    // future instances of the plugin

    this.options = $.extend({}, defaults, options);
    this._defaults = defaults;
    this._name = pluginName;
    this.init();
  } // end constructor


  Plugin.prototype = {
    init: function init() {
      var that = this;
      var options = this.options;
      $(this.element).submit(function (event) {
        that.analyticsEventTrack(options.type, options.category, options.action, options.label); // also bubbles the event up to submit the form
      });
    },
    analyticsEventTrack: function analyticsEventTrack(type, category, action, label, value) {
      if (typeof ga === 'undefined') {
        return;
      }

      if (typeof value === 'undefined') {
        ga('send', type, category, action, label);
        return;
      }

      ga('send', type, category, action, label, value);
    } // end analyticsEventTrack

  }; // end Plugin.prototype
  // A really lightweight plugin wrapper around the constructor,
  // preventing against multiple instantiations

  $.fn[pluginName] = function (options) {
    return this.each(function () {
      if (!$.data(this, 'plugin_' + pluginName)) {
        $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
      }
    });
  };
})(jQuery, window, document);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFtb3VudC1zZWxlY3QuanMiLCJiZW5lZml0cy5qcyIsImN0YS5qcyIsIm1lbWJlci1sZXZlbHMuanMiLCJ0cmFjay1zdWJtaXQuanMiXSwibmFtZXMiOlsiJCIsIndpbmRvdyIsImRvY3VtZW50IiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiZnJlcXVlbmN5U2VsZWN0b3IiLCJhbW91bnRTZWxlY3RvciIsImFtb3VudExhYmVscyIsImFtb3VudFZhbHVlIiwiYW1vdW50RGVzY3JpcHRpb24iLCJhbW91bnRGaWVsZCIsIlBsdWdpbiIsImVsZW1lbnQiLCJvcHRpb25zIiwiZXh0ZW5kIiwiX2RlZmF1bHRzIiwiX25hbWUiLCJpbml0IiwicHJvdG90eXBlIiwiZnJlcXVlbmNpZXMiLCJmaW5kIiwiYW1vdW50cyIsImFtb3VudCIsInNldEFtb3VudExhYmVscyIsImZpbHRlciIsInZhbCIsImNoYW5nZSIsIm9uRnJlcXVlbmN5Q2hhbmdlIiwiYmluZCIsIm9uIiwiY2xlYXJBbW91bnRGaWVsZCIsImNsZWFyQW1vdW50U2VsZWN0b3IiLCJldmVudCIsInRhcmdldCIsImZyZXF1ZW5jeVN0cmluZyIsImFtb3VudEVsZW1lbnQiLCJkZXNjRWxlbWVudCIsImxhYmVscyIsInR5cGVBbmRGcmVxdWVuY3kiLCJ0eXBlIiwiZnJlcXVlbmN5IiwibGVuZ3RoIiwic3BsaXQiLCJwYXJzZUludCIsImVhY2giLCJpbmRleCIsIiRsYWJlbCIsImF0dHIiLCJhbW91bnRUZXh0IiwiZGVzYyIsImRhdGEiLCJ0ZXh0IiwicmVtb3ZlQXR0ciIsImZuIiwialF1ZXJ5IiwiYmVuZWZpdEZvcm0iLCJwZXJmb3JtYW5jZSIsIm5hdmlnYXRpb24iLCJsb2NhdGlvbiIsInJlbG9hZCIsImNsaWNrIiwicHJldmVudERlZmF1bHQiLCIkYnV0dG9uIiwiJHN0YXR1cyIsInBhcmVudCIsIiRzZWxlY3QiLCJzZXR0aW5ncyIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiYmVuZWZpdFR5cGUiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwic3VjY2VzcyIsImJ1dHRvbl92YWx1ZSIsImJ1dHRvbl9sYWJlbCIsImJ1dHRvbl9jbGFzcyIsInByb3AiLCJidXR0b25fYXR0ciIsImh0bWwiLCJtZXNzYWdlIiwibWVzc2FnZV9jbGFzcyIsIm5vdCIsInJlbW92ZV9pbnN0YW5jZV92YWx1ZSIsInNob3ciLCJoaWRlIiwiaSIsInJlbW92ZSIsInJlYWR5IiwibXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQiLCJjYXRlZ29yeSIsImFjdGlvbiIsImxhYmVsIiwidmFsdWUiLCJnYSIsInBhdGhuYW1lIiwidW5kZWZpbmVkIiwicmVzZXQiLCJjYXRjaEhhc2hMaW5rcyIsImxldmVsRmxpcHBlciIsInN0YXJ0TGV2ZWxDbGljayIsImUiLCJyZXBsYWNlIiwiaG9zdG5hbWUiLCJoYXNoIiwic2xpY2UiLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIiwidGhhdCIsInByZXZpb3VzX2Ftb3VudCIsImxldmVsIiwibGV2ZWxfbnVtYmVyIiwiZnJlcXVlbmN5X3N0cmluZyIsImZyZXF1ZW5jeV9uYW1lIiwibWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhIiwidXNlcl9jdXJyZW50X2xldmVsIiwiY3VycmVudF91c2VyIiwiYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUiLCJmcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsImNoZWNrTGV2ZWwiLCJzaG93TmV3TGV2ZWwiLCJsZXZlbHNfY29udGFpbmVyIiwic2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IiLCJmbGlwcGVkX2l0ZW1zIiwid3JhcEFsbCIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJzaW5nbGVfbGV2ZWxfY29udGFpbmVyIiwiY2xvc2VzdCIsImFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJhbW91bnRfdmlld2VyIiwiY2hhbmdlRnJlcXVlbmN5IiwibGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IiLCJjaGFuZ2VBbW91bnRQcmV2aWV3IiwiY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJ0aGlzeWVhciIsInByaW9yX3llYXJfYW1vdW50IiwicHJpb3JfeWVhcl9jb250cmlidXRpb25zIiwiY29taW5nX3llYXJfYW1vdW50IiwiY29taW5nX3llYXJfY29udHJpYnV0aW9ucyIsImFubnVhbF9yZWN1cnJpbmdfYW1vdW50IiwiTWF0aCIsIm1heCIsImdldExldmVsIiwibWVtYmVyX2xldmVsX3ByZWZpeCIsIm9sZF9sZXZlbCIsImxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyIiwiZGVjb2RlSHRtbEVudGl0eSIsInN0ciIsIm1hdGNoIiwiZGVjIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwidG9Mb3dlckNhc2UiLCJtZW1iZXJfbGV2ZWwiLCJsZXZlbF9uYW1lIiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyIsInN1Ym1pdCIsImFuYWx5dGljc0V2ZW50VHJhY2siXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTs7QUFBQyxDQUFDLFVBQVdBLENBQVgsRUFBY0MsTUFBZCxFQUFzQkMsUUFBdEIsRUFBaUM7QUFDbEM7QUFDQSxNQUFJQyxVQUFVLEdBQUcsc0JBQWpCO0FBQUEsTUFDQUMsUUFBUSxHQUFHO0FBQ1ZDLElBQUFBLGlCQUFpQixFQUFFLHlDQURUO0FBRVZDLElBQUFBLGNBQWMsRUFBRSxzQ0FGTjtBQUdWQyxJQUFBQSxZQUFZLEVBQUUsd0JBSEo7QUFJVkMsSUFBQUEsV0FBVyxFQUFFLFFBSkg7QUFLVkMsSUFBQUEsaUJBQWlCLEVBQUUsdUJBTFQ7QUFNVkMsSUFBQUEsV0FBVyxFQUFFO0FBTkgsR0FEWCxDQUZrQyxDQVlsQzs7QUFDQSxXQUFTQyxNQUFULENB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USxJQUFSLEVBQWMsWUFBWS9DLFVBQTFCLEVBQXNDLElBQUlRLE1BQUosQ0FBWSxJQUFaLEVBQWtCRSxPQUFsQixDQUF0QztBQUNBO0FBQ0QsS0FKTSxDQUFQO0FBS0EsR0FORDtBQU9BLENBbEVBLEVBa0VHeUMsTUFsRUgsRUFrRVdyRCxNQWxFWCxFQWtFbUJDLFFBbEVuQiIsImZpbGUiOiJtaW5ucG9zdC1tZW1iZXJzaGlwLWZyb250LWVuZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQgKSB7XG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdEFtb3VudFNlbGVjdCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdGZyZXF1ZW5jeVNlbGVjdG9yOiAnLm0tZnJlcXVlbmN5LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGFtb3VudFNlbGVjdG9yOiAnLm0tYW1vdW50LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGFtb3VudExhYmVsczogJy5tLWFtb3VudC1zZWxlY3QgbGFiZWwnLFxuXHRcdGFtb3VudFZhbHVlOiAnc3Ryb25nJyxcblx0XHRhbW91bnREZXNjcmlwdGlvbjogJy5hLWFtb3VudC1kZXNjcmlwdGlvbicsXG5cdFx0YW1vdW50RmllbGQ6ICcuYS1hbW91bnQtZmllbGQgI2Ftb3VudCdcblx0fTtcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXHRcdGluaXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGZyZXF1ZW5jaWVzID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICk7XG5cdFx0XHR2YXIgYW1vdW50cyA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApO1xuXHRcdFx0dmFyIGFtb3VudCA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCApO1xuXG5cdFx0XHR0aGlzLnNldEFtb3VudExhYmVscyggZnJlcXVlbmNpZXMuZmlsdGVyKCc6Y2hlY2tlZCcpLnZhbCgpICk7XG5cdFx0XHRmcmVxdWVuY2llcy5jaGFuZ2UoIHRoaXMub25GcmVxdWVuY3lDaGFuZ2UuYmluZCh0aGlzKSApO1xuXHRcdFx0YW1vdW50cy5vbiggJ2NoYW5nZScsIHRoaXMuY2xlYXJBbW91bnRGaWVsZC5iaW5kKHRoaXMpICk7XG5cdFx0XHRhbW91bnQub24oICdrZXl1cCBtb3VzZXVwJywgdGhpcy5jbGVhckFtb3VudFNlbGVjdG9yLmJpbmQodGhpcykgKTtcblx0XHR9LFxuXG5cdFx0b25GcmVxdWVuY3lDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMuc2V0QW1vdW50TGFiZWxzKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSApO1xuXHRcdH0sXG5cblx0XHRzZXRBbW91bnRMYWJlbHM6IGZ1bmN0aW9uKCBmcmVxdWVuY3lTdHJpbmcgKSB7XG5cdFx0XHR2YXIgYW1vdW50RWxlbWVudCA9IHRoaXMub3B0aW9ucy5hbW91bnRWYWx1ZTtcblx0XHRcdHZhciBkZXNjRWxlbWVudCA9IHRoaXMub3B0aW9ucy5hbW91bnREZXNjcmlwdGlvbjtcblx0XHRcdHZhciBsYWJlbHMgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50TGFiZWxzICk7XG5cdFx0XHR2YXIgdHlwZUFuZEZyZXF1ZW5jeTtcblx0XHRcdHZhciB0eXBlO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeTtcblxuXHRcdFx0aWYgKCBsYWJlbHMubGVuZ3RoIDwgMCB8fCB0eXBlb2YgZnJlcXVlbmN5U3RyaW5nID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR0eXBlQW5kRnJlcXVlbmN5ID0gZnJlcXVlbmN5U3RyaW5nLnNwbGl0KCcgLSAnKTtcblx0XHRcdHR5cGUgPSB0eXBlQW5kRnJlcXVlbmN5WzBdO1xuXHRcdFx0ZnJlcXVlbmN5ID0gcGFyc2VJbnQoIHR5cGVBbmRGcmVxdWVuY3lbMV0sIDEwICk7XG5cblx0XHRcdGxhYmVscy5lYWNoKCBmdW5jdGlvbiggaW5kZXggKSB7XG5cdFx0XHRcdHZhciAkbGFiZWwgPSAkKCB0aGlzICk7XG5cdFx0XHRcdHZhciBhbW91bnQgPSBwYXJzZUludCggJCggJyMnICsgJGxhYmVsLmF0dHIoICdmb3InICkgKS52YWwoKSwgMTAgKTtcblx0XHRcdFx0dmFyIGFtb3VudFRleHQgPSAnJCcgKyAoIHR5cGUgPT09ICdwZXIgeWVhcicgPyBhbW91bnQgKiAxMiA6IGFtb3VudCk7XG5cdFx0XHRcdHZhciBkZXNjID0gJGxhYmVsLmRhdGEoIHR5cGUgPT09ICdwZXIgeWVhcicgPyAneWVhcmx5LWRlc2MnIDogJ21vbnRobHktZGVzYycgKTtcblxuXHRcdFx0XHQkKCB0aGlzICkuZmluZCggYW1vdW50RWxlbWVudCApLnRleHQoIGFtb3VudFRleHQgKVxuXHRcdFx0XHQkKCB0aGlzICkuZmluZCggZGVzY0VsZW1lbnQgKS50ZXh0KCBkZXNjICk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgc2V0QW1vdW50TGFiZWxzXG5cblx0XHRjbGVhckFtb3VudFNlbGVjdG9yOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgYW1vdW50cyA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApO1xuXG5cdFx0XHRpZiAoICQoIGV2ZW50LnRhcmdldCApLnZhbCgpID09PSAnJyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRhbW91bnRzLnJlbW92ZUF0dHIoJ2NoZWNrZWQnKTtcblx0XHR9LFxuXG5cdFx0Y2xlYXJBbW91bnRGaWVsZDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0JCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICkudmFsKCBudWxsICk7XG5cdFx0fSxcblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCApO1xuIiwiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBiZW5lZml0Rm9ybSgpIHtcblx0XHRpZiAoIDIgPT09IHBlcmZvcm1hbmNlLm5hdmlnYXRpb24udHlwZSApIHtcblx0XHQgICBsb2NhdGlvbi5yZWxvYWQoIHRydWUgKTtcblx0XHR9XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uLmEtYnV0dG9uLWRpc2FibGVkJyApLnJlbW92ZUF0dHIoICdkaXNhYmxlZCcgKTtcblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR2YXIgJGJ1dHRvbiAgPSAkKCB0aGlzICk7XG5cdFx0XHR2YXIgJHN0YXR1cyAgPSAkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJywgJCggdGhpcyApLnBhcmVudCgpICk7XG5cdFx0XHR2YXIgJHNlbGVjdCAgPSAkKCAnc2VsZWN0JywgJCggdGhpcyApLnBhcmVudCgpICk7XG5cdFx0XHR2YXIgc2V0dGluZ3MgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzO1xuXHRcdFx0Ly8gcmVzZXQgdGhlIG1lc3NhZ2UgZm9yIGN1cnJlbnQgc3RhdHVzXG5cdFx0XHRpZiAoICEgJy5tLWJlbmVmaXQtbWVzc2FnZS1zdWNjZXNzJyApIHtcblx0XHRcdFx0JCggJy5tLWJlbmVmaXQtbWVzc2FnZScgKS5yZW1vdmVDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgbS1iZW5lZml0LW1lc3NhZ2UtZXJyb3IgbS1iZW5lZml0LW1lc3NhZ2UtaW5mbycgKTtcblx0XHRcdH1cblx0XHRcdC8vIHNldCBidXR0b24gdG8gcHJvY2Vzc2luZ1xuXHRcdFx0JGJ1dHRvbi50ZXh0KCAnUHJvY2Vzc2luZycgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXG5cdFx0XHQvLyBkaXNhYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLmFkZENsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cblx0XHRcdC8vIHNldCBhamF4IGRhdGFcblx0XHRcdHZhciBkYXRhID0ge307XG5cdFx0XHR2YXIgYmVuZWZpdFR5cGUgPSAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScgKS52YWwoKTtcblx0XHRcdGlmICggJ3BhcnRuZXItb2ZmZXJzJyA9PT0gYmVuZWZpdFR5cGUgKSB7XG5cdFx0XHQgICAgZGF0YSA9IHtcblx0XHRcdCAgICAgICAgJ2FjdGlvbicgOiAnYmVuZWZpdF9mb3JtX3N1Ym1pdCcsXG5cdFx0XHQgICAgICAgICdtaW5ucG9zdF9tZW1iZXJzaGlwX2JlbmVmaXRfZm9ybV9ub25jZScgOiAkYnV0dG9uLmRhdGEoICdiZW5lZml0LW5vbmNlJyApLFxuXHRcdFx0ICAgICAgICAnY3VycmVudF91cmwnIDogJCggJ2lucHV0W25hbWU9XCJjdXJyZW50X3VybFwiXScpLnZhbCgpLFxuXHRcdFx0ICAgICAgICAnYmVuZWZpdC1uYW1lJzogJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nKS52YWwoKSxcblx0XHRcdCAgICAgICAgJ2luc3RhbmNlX2lkJyA6ICQoICdbbmFtZT1cImluc3RhbmNlLWlkLScgKyAkYnV0dG9uLnZhbCgpICsgJ1wiXScgKS52YWwoKSxcblx0XHRcdCAgICAgICAgJ3Bvc3RfaWQnIDogJGJ1dHRvbi52YWwoKSxcblx0XHRcdCAgICAgICAgJ2lzX2FqYXgnIDogJzEnLFxuXHRcdFx0ICAgIH07XG5cblx0XHRcdCAgICAkLnBvc3QoIHNldHRpbmdzLmFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdCAgICBcdC8vIHN1Y2Nlc3Ncblx0XHRcdFx0ICAgIGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0ICAgIFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdCAgICBcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdCAgICBcdCRzdGF0dXMuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuYWRkQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3MgKTtcblx0XHRcdFx0ICAgIFx0aWYgKCAwIDwgJHNlbGVjdC5sZW5ndGggKSB7XG5cdFx0XHRcdCAgICBcdFx0JHNlbGVjdC5wcm9wKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdFx0XHRcdCAgICBcdH1cblx0XHRcdFx0ICAgIFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS5hdHRyKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdFx0XHRcdCAgICB9IGVsc2Uge1xuXHRcdFx0XHQgICAgXHQvLyBlcnJvclxuXHRcdFx0XHQgICAgXHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0ICAgIFx0aWYgKCAndW5kZWZpbmVkJyA9PT0gdHlwZW9mIHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlICkge1xuXHRcdFx0XHRcdCAgICBcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdCAgICBcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHQgICAgXHR9XG5cdFx0XHRcdFx0ICAgIH0gZWxzZSB7XG5cdFx0XHRcdCAgICBcdFx0JCggJ29wdGlvbicsICRzZWxlY3QgKS5lYWNoKCBmdW5jdGlvbiggaSApIHtcblx0XHRcdFx0ICAgIFx0XHRcdGlmICggJCggdGhpcyApLnZhbCgpID09PSByZXNwb25zZS5kYXRhLnJlbW92ZV9pbnN0YW5jZV92YWx1ZSApIHtcblx0XHRcdFx0ICAgIFx0XHRcdFx0JCggdGhpcyApLnJlbW92ZSgpO1xuXHRcdFx0XHQgICAgXHRcdFx0fVxuXHRcdFx0XHQgICAgXHRcdH0pO1xuXHRcdFx0XHQgICAgXHRcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdCAgICBcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHQgICAgXHR9XG5cdFx0XHRcdCAgICBcdH1cblx0XHRcdFx0ICAgIFx0Ly8gcmUtZW5hYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0XHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cdFx0XHRcdCAgICBcdCRzdGF0dXMuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuYWRkQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3MgKTtcblx0XHRcdFx0ICAgIH1cblxuXHRcdFx0XHR9KTtcblx0XHQgICAgfVxuXHRcdH0pO1xuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCAwIDwgJCggJy5tLWZvcm0tbWVtYmVyc2hpcC1iZW5lZml0JyApLmxlbmd0aCApIHtcblx0XHRcdGJlbmVmaXRGb3JtKCk7XG5cdFx0fVxuXHR9KTtcblxuXHQkKCAnLmEtcmVmcmVzaC1wYWdlJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRsb2NhdGlvbi5yZWxvYWQoKTtcblx0fSk7XG5cbn0gKSggalF1ZXJ5ICk7XG4iLCIoIGZ1bmN0aW9uKCAkICkge1xuXHRmdW5jdGlvbiBtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCggdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICkge1xuXHRcdGlmICggdHlwZW9mIGdhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdGlmICggdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7IFxuXHRcdCQoICcubS1zdXBwb3J0LWN0YS10b3AgLmEtc3VwcG9ydC1idXR0b24nICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciB2YWx1ZSA9ICcnO1xuXHRcdFx0aWYgKCAkKCAnc3ZnJywgJCggdGhpcyApICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0dmFsdWUgPSAkKCAnc3ZnJywgJCggdGhpcyApICkuYXR0ciggJ3RpdGxlJyApICsgJyAnO1xuXHRcdFx0fVxuXHRcdFx0dmFsdWUgPSB2YWx1ZSArICQoIHRoaXMgKS50ZXh0KCk7XG5cdFx0XHRtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCggJ2V2ZW50JywgJ1N1cHBvcnQgQ1RBIC0gSGVhZGVyJywgJ0NsaWNrOiAnICsgdmFsdWUsIGxvY2F0aW9uLnBhdGhuYW1lICk7XG5cdFx0fSk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgdW5kZWZpbmVkICkge1xuXG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHQnZGVidWcnIDogZmFsc2UsIC8vIHRoaXMgY2FuIGJlIHNldCB0byB0cnVlIG9uIHBhZ2UgbGV2ZWwgb3B0aW9uc1xuXHRcdCdhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZScgOiAnI2Ftb3VudC1pdGVtICNhbW91bnQnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZScgOiAnLm0tbWVtYmVyc2hpcC1mYXN0LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdCdsZXZlbF92aWV3ZXJfY29udGFpbmVyJyA6ICcuYS1zaG93LWxldmVsJyxcblx0XHQnbGV2ZWxfbmFtZScgOiAnLmEtbGV2ZWwnLFxuXHRcdCd1c2VyX2N1cnJlbnRfbGV2ZWwnIDogJy5hLWN1cnJlbnQtbGV2ZWwnLFxuXHRcdCd1c2VyX25ld19sZXZlbCcgOiAnLmEtbmV3LWxldmVsJyxcblx0XHQnYW1vdW50X3ZpZXdlcicgOiAnLmFtb3VudCBoMycsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hLWZvcm0taXRlbS1tZW1iZXJzaGlwLWZyZXF1ZW5jeScsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHNfdHlwZScgOiAnc2VsZWN0Jyxcblx0XHQnbGV2ZWxzX2NvbnRhaW5lcicgOiAnLm8tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWxzJyxcblx0XHQnc2luZ2xlX2xldmVsX2NvbnRhaW5lcicgOiAnLm0tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWwnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcicgOiAnLm0tbWVtYmVyLWxldmVsLWJyaWVmJyxcblx0XHQnZmxpcHBlZF9pdGVtcycgOiAnZGl2LmFtb3VudCwgZGl2LmVudGVyJyxcblx0XHQnbGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3InIDogJy5zaG93LWZyZXF1ZW5jeScsXG5cdFx0J2Nob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYW1vdW50IC5hLWJ1dHRvbi1mbGlwJyxcblx0XHQnYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmVudGVyIGlucHV0LmFtb3VudC1lbnRyeScsXG5cdH07IC8vIGVuZCBkZWZhdWx0c1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblxuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblxuXHRcdGluaXQ6IGZ1bmN0aW9uKCByZXNldCwgYW1vdW50ICkge1xuXHRcdFx0Ly8gUGxhY2UgaW5pdGlhbGl6YXRpb24gbG9naWMgaGVyZVxuXHRcdFx0Ly8gWW91IGFscmVhZHkgaGF2ZSBhY2Nlc3MgdG8gdGhlIERPTSBlbGVtZW50IGFuZFxuXHRcdFx0Ly8gdGhlIG9wdGlvbnMgdmlhIHRoZSBpbnN0YW5jZSwgZS5nLiB0aGlzLmVsZW1lbnRcblx0XHRcdC8vIGFuZCB0aGlzLm9wdGlvbnNcblx0XHRcdC8vIHlvdSBjYW4gYWRkIG1vcmUgZnVuY3Rpb25zIGxpa2UgdGhlIG9uZSBiZWxvdyBhbmRcblx0XHRcdC8vIGNhbGwgdGhlbSBsaWtlIHNvOiB0aGlzLnlvdXJPdGhlckZ1bmN0aW9uKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKS5cblx0XHRcdHRoaXMuY2F0Y2hIYXNoTGlua3MoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKTtcblx0XHRcdHRoaXMubGV2ZWxGbGlwcGVyKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdFx0dGhpcy5zdGFydExldmVsQ2xpY2soIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0fSxcblxuXHRcdGNhdGNoSGFzaExpbmtzOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJ2FbaHJlZio9XCIjXCJdOm5vdChbaHJlZj1cIiNcIl0pJywgZWxlbWVudCkuY2xpY2soZnVuY3Rpb24oZSkge1xuXHRcdFx0ICAgIHZhciB0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblx0XHRcdCAgICBpZiAodGFyZ2V0LnBhcmVudCgnLmNvbW1lbnQtdGl0bGUnKS5sZW5ndGggPT0gMCAmJiBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgPT0gdGhpcy5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgJiYgbG9jYXRpb24uaG9zdG5hbWUgPT0gdGhpcy5ob3N0bmFtZSkge1xuXHRcdFx0XHQgICAgdmFyIHRhcmdldCA9ICQodGhpcy5oYXNoKTtcblx0XHRcdFx0ICAgIHRhcmdldCA9IHRhcmdldC5sZW5ndGggPyB0YXJnZXQgOiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsnXScpO1xuXHRcdFx0XHRcdGlmICh0YXJnZXQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQkKCdodG1sLGJvZHknKS5hbmltYXRlKHtcblx0XHRcdFx0XHRcdFx0c2Nyb2xsVG9wOiB0YXJnZXQub2Zmc2V0KCkudG9wXG5cdFx0XHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbEZsaXBwZXI6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIHByZXZpb3VzX2Ftb3VudCA9ICcnO1xuXHRcdFx0dmFyIGFtb3VudCA9IDA7XG5cdFx0XHR2YXIgbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSAwO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3kgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9ICcnO1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyAmJiAkKCBvcHRpb25zLnVzZXJfY3VycmVudF9sZXZlbCApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdHByZXZpb3VzX2Ftb3VudCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50O1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkubGVuZ3RoID4gMCAmJlxuXHRcdFx0ICAgICAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpO1xuXHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKCk7XG5cdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHQgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cblx0XHRcdCAgICAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUpLmNoYW5nZSggZnVuY3Rpb24oKSB7XG5cblx0XHRcdCAgICBcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKClcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHQgICAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpLCAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJyApLmF0dHIoICdkYXRhLXllYXItZnJlcXVlbmN5JyApLCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdCAgICB9KTtcblxuXHRcdFx0ICAgICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSkuYmluZCgna2V5dXAgbW91c2V1cCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0ICAgIFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKVxuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHQgICAgICBpZigkKHRoaXMpLmRhdGEoJ2xhc3QtdmFsdWUnKSAhPSAkKHRoaXMpLnZhbCgpKSB7XG5cdFx0XHQgICAgICAgICQodGhpcykuZGF0YSgnbGFzdC12YWx1ZScsICQodGhpcykudmFsKCkpO1xuXHRcdFx0ICAgICAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpLCAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJyApLmF0dHIoICdkYXRhLXllYXItZnJlcXVlbmN5JyApLCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXHRcdFx0ICAgICAgfTtcblx0XHRcdCAgICB9KTtcblxuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmxldmVsc19jb250YWluZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50ICkuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmZsaXBwZWRfaXRlbXMsICQodGhpcykgKS53cmFwQWxsKCAnPGRpdiBjbGFzcz1cImZsaXBwZXJcIi8+JyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkub24oJ2NoYW5nZScsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQodGhpcykuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKHRoaXMpLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdCAgICBpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBmcmVxdWVuY3kgPT0gMSApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQteWVhcmx5JyApICk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3kgPT0gMTIgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LW1vbnRobHknICkgKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXG5cdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlRnJlcXVlbmN5KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAkKCBvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciwgZWxlbWVudCkudGV4dChmcmVxdWVuY3lfbmFtZSk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS52YWwoKTtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dGhhdC5jaGFuZ2VBbW91bnRQcmV2aWV3KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykucGFyZW50KCkgKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGxldmVsRmxpcHBlclxuXG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0ICB2YXIgdGhpc3llYXIgPSBwYXJzZUludCggYW1vdW50ICkgKiBwYXJzZUludCggZnJlcXVlbmN5ICk7XG5cdFx0ICB2YXIgbGV2ZWwgPSAnJztcblx0XHQgIGlmICggdHlwZW9mIHByZXZpb3VzX2Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJldmlvdXNfYW1vdW50ICE9PSAnJyApIHtcblx0XHQgICAgdmFyIHByaW9yX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5wcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMgKTtcblx0XHQgICAgdmFyIGNvbWluZ195ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQuY29taW5nX3llYXJfY29udHJpYnV0aW9ucyApO1xuXHRcdCAgICB2YXIgYW5udWFsX3JlY3VycmluZ19hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LmFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0ICAgIC8vIGNhbGN1bGF0ZSBtZW1iZXIgbGV2ZWwgZm9ybXVsYVxuXHRcdCAgICBpZiAoIHR5cGUgPT09ICdvbmUtdGltZScgKSB7XG5cdFx0ICAgICAgcHJpb3JfeWVhcl9hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0ICAgIH0gZWxzZSB7XG5cdFx0ICAgICAgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0ICAgIH1cblxuXHRcdCAgICB0aGlzeWVhciA9IE1hdGgubWF4KCBwcmlvcl95ZWFyX2Ftb3VudCwgY29taW5nX3llYXJfYW1vdW50LCBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdCAgfVxuXG5cdFx0ICBsZXZlbCA9IHRoaXMuZ2V0TGV2ZWwoIHRoaXN5ZWFyICk7XG5cblx0XHQgICQoJ2gyJywgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0ICAgIGlmICggJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWxbJ25hbWUnXSApIHtcblx0XHQgICAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdCAgICAgICQodGhpcykucGFyZW50KCkucGFyZW50KCkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0ICAgIH1cblx0XHQgIH0gKTtcblx0XHQgIHJldHVybiBsZXZlbDtcblxuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRnZXRMZXZlbDogZnVuY3Rpb24oIHRoaXN5ZWFyICkge1xuXHRcdFx0dmFyIGxldmVsID0gW107XG5cdFx0XHRpZiAoIHRoaXN5ZWFyID4gMCAmJiB0aGlzeWVhciA8IDYwICkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0Jyb256ZSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDE7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0aGlzeWVhciA+IDU5ICYmIHRoaXN5ZWFyIDwgMTIwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnU2lsdmVyJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMjtcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAxMTkgJiYgdGhpc3llYXIgPCAyNDApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdHb2xkJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMztcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAyMzkpIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdQbGF0aW51bSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGdldExldmVsXG5cblx0XHRzaG93TmV3TGV2ZWw6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApIHtcblx0XHRcdHZhciBtZW1iZXJfbGV2ZWxfcHJlZml4ID0gJyc7XG5cdFx0XHR2YXIgb2xkX2xldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciA9IG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcjsgLy8gdGhpcyBzaG91bGQgY2hhbmdlIHdoZW4gd2UgcmVwbGFjZSB0aGUgdGV4dCwgaWYgdGhlcmUgaXMgYSBsaW5rIGluc2lkZSBpdFxuXHRcdFx0dmFyIGRlY29kZUh0bWxFbnRpdHkgPSBmdW5jdGlvbiggc3RyICkge1xuXHRcdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoIC8mIyhcXGQrKTsvZywgZnVuY3Rpb24oIG1hdGNoLCBkZWMgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoIGRlYyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRtZW1iZXJfbGV2ZWxfcHJlZml4ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLm1lbWJlcl9sZXZlbF9wcmVmaXg7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcikucHJvcCggJ2NsYXNzJywgJ2Etc2hvdy1sZXZlbCBhLXNob3ctbGV2ZWwtJyArIGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApO1xuXG5cdFx0XHRcdGlmICggJCggb3B0aW9ucy51c2VyX2N1cnJlbnRfbGV2ZWwgKS5sZW5ndGggPiAwICYmIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0XHRpZiAoICdhJywgJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgPSBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKyAnIGEnO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG9sZF9sZXZlbCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLnJlcGxhY2UoIG1lbWJlcl9sZXZlbF9wcmVmaXgsICcnICk7XG5cblx0XHRcdFx0XHRpZiAoIG9sZF9sZXZlbCAhPT0gbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICkge1xuXHRcdFx0XHRcdFx0JCggbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmRhdGEoICdjaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmRhdGEoICdub3QtY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0JChvcHRpb25zLmxldmVsX25hbWUsIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcikudGV4dCggbGV2ZWxbJ25hbWUnXSApO1xuXHRcdFx0fVxuXG5cdFx0fSwgLy8gZW5kIHNob3dOZXdMZXZlbFxuXG5cdFx0Y2hhbmdlRnJlcXVlbmN5OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHQgICAgdmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0ICAgIHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3kgICAgICA9IHBhcnNlSW50KCBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMV0gKTtcblxuXHRcdFx0ICAgICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnZhbCggc2VsZWN0ZWQgKTtcbiAgICBcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5wcm9wKCAnc2VsZWN0ZWQnLCBzZWxlY3RlZCApO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG4gICAgXHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkuZGF0YSggJ2ZyZXF1ZW5jeScsIGZyZXF1ZW5jeSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUZyZXF1ZW5jeVxuXG5cdFx0Y2hhbmdlQW1vdW50UHJldmlldzogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0ICAgIHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdCAgICB2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUFtb3VudFByZXZpZXdcblxuXHRcdHN0YXJ0TGV2ZWxDbGljazogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCcuc3RhcnQtbGV2ZWwnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGxldmVsX2NsYXNzID0gJCggdGhpcyApLnByb3AoICdjbGFzcycgKTtcblx0XHRcdFx0dmFyIGxldmVsX251bWJlciA9IGxldmVsX2NsYXNzW2xldmVsX2NsYXNzLmxlbmd0aCAtMV07XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciwgZWxlbWVudCApLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciArICcgJyArIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHQgIH0pO1xuXHRcdH0sIC8vIGVuZCBzdGFydExldmVsQ2xpY2tcblxuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xuXG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50ICk7XG4iLCIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50ICkge1xuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RUcmFja1N1Ym1pdCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdHR5cGU6ICdldmVudCcsXG5cdFx0Y2F0ZWdvcnk6ICdTdXBwb3J0IFVzJyxcblx0XHRhY3Rpb246ICdCZWNvbWUgQSBNZW1iZXInLFxuXHRcdGxhYmVsOiBsb2NhdGlvbi5wYXRobmFtZVxuXHR9O1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG5cblx0XHRcdCQoIHRoaXMuZWxlbWVudCApLnN1Ym1pdCggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHR0aGF0LmFuYWx5dGljc0V2ZW50VHJhY2soXG5cdFx0XHRcdFx0b3B0aW9ucy50eXBlLFxuXHRcdFx0XHRcdG9wdGlvbnMuY2F0ZWdvcnksXG5cdFx0XHRcdFx0b3B0aW9ucy5hY3Rpb24sXG5cdFx0XHRcdFx0b3B0aW9ucy5sYWJlbFxuXHRcdFx0XHQpO1xuXHRcdFx0XHQvLyBhbHNvIGJ1YmJsZXMgdGhlIGV2ZW50IHVwIHRvIHN1Ym1pdCB0aGUgZm9ybVxuXHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdGFuYWx5dGljc0V2ZW50VHJhY2s6IGZ1bmN0aW9uKCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKSB7XG5cdFx0XHRpZiAoIHR5cGVvZiBnYSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApO1xuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NFdmVudFRyYWNrXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQgKTtcbiJdfQ==
