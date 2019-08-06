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
        var $amount = $('#' + $label.attr('for'));
        var amount = parseInt($label.data('monthly-amount'), 10);
        var newAmount = type === 'per year' ? amount * 12 : amount;
        var amountText = '$' + newAmount;
        var desc = $label.data(type === 'per year' ? 'yearly-desc' : 'monthly-desc');
        $amount.val(newAmount);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFtb3VudC1zZWxlY3QuanMiLCJiZW5lZml0cy5qcyIsImN0YS5qcyIsIm1lbWJlci1sZXZlbHMuanMiLCJ0cmFjay1zdWJtaXQuanMiXSwibmFtZXMiOlsiJCIsIndpbmRvdyIsImRvY3VtZW50IiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiZnJlcXVlbmN5U2VsZWN0b3IiLCJhbW91bnRTZWxlY3RvciIsImFtb3VudExhYmVscyIsImFtb3VudFZhbHVlIiwiYW1vdW50RGVzY3JpcHRpb24iLCJhbW91bnRGaWVsZCIsIlBsdWdpbiIsImVsZW1lbnQiLCJvcHRpb25zIiwiZXh0ZW5kIiwiX2RlZmF1bHRzIiwiX25hbWUiLCJpbml0IiwicHJvdG90eXBlIiwiZnJlcXVlbmNpZXMiLCJmaW5kIiwiYW1vdW50cyIsImFtb3VudCIsInNldEFtb3VudExhYmVscyIsImZpbHRlciIsInZhbCIsImNoYW5nZSIsIm9uRnJlcXVlbmN5Q2hhbmdlIiwiYmluZCIsIm9uIiwiY2xlYXJBbW91bnRGaWVsZCIsImNsZWFyQW1vdW50U2VsZWN0b3IiLCJldmVudCIsInRhcmdldCIsImZyZXF1ZW5jeVN0cmluZyIsImFtb3VudEVsZW1lbnQiLCJkZXNjRWxlbWVudCIsImxhYmVscyIsInR5cGVBbmRGcmVxdWVuY3kiLCJ0eXBlIiwiZnJlcXVlbmN5IiwibGVuZ3RoIiwic3BsaXQiLCJwYXJzZUludCIsImVhY2giLCJpbmRleCIsIiRsYWJlbCIsIiRhbW91bnQiLCJhdHRyIiwiZGF0YSIsIm5ld0Ftb3VudCIsImFtb3VudFRleHQiLCJkZXNjIiwidGV4dCIsInJlbW92ZUF0dHIiLCJmbiIsImpRdWVyeSIsImJlbmVmaXRGb3JtIiwicGVyZm9ybWFuY2UiLCJuYXZpZ2F0aW9uIiwibG9jYXRpb24iLCJyZWxvYWQiLCJjbGljayIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsIiRzdGF0dXMiLCJwYXJlbnQiLCIkc2VsZWN0Iiwic2V0dGluZ3MiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImJlbmVmaXRUeXBlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJidXR0b25fdmFsdWUiLCJidXR0b25fbGFiZWwiLCJidXR0b25fY2xhc3MiLCJwcm9wIiwiYnV0dG9uX2F0dHIiLCJodG1sIiwibWVzc2FnZSIsIm1lc3NhZ2VfY2xhc3MiLCJub3QiLCJyZW1vdmVfaW5zdGFuY2VfdmFsdWUiLCJzaG93IiwiaGlkZSIsImkiLCJyZW1vdmUiLCJyZWFkeSIsIm1wX21lbWJlcnNoaXBfYW5hbHl0aWNzX3RyYWNraW5nX2V2ZW50IiwiY2F0ZWdvcnkiLCJhY3Rpb24iLCJsYWJlbCIsInZhbHVlIiwiZ2EiLCJwYXRobmFtZSIsInVuZGVmaW5lZCIsInJlc2V0IiwiY2F0Y2hIYXNoTGlua3MiLCJsZXZlbEZsaXBwZXIiLCJzdGFydExldmVsQ2xpY2siLCJlIiwicmVwbGFjZSIsImhvc3RuYW1lIiwiaGFzaCIsInNsaWNlIiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsIm9mZnNldCIsInRvcCIsInRoYXQiLCJwcmV2aW91c19hbW91bnQiLCJsZXZlbCIsImxldmVsX251bWJlciIsImZyZXF1ZW5jeV9zdHJpbmciLCJmcmVxdWVuY3lfbmFtZSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSIsInVzZXJfY3VycmVudF9sZXZlbCIsImN1cnJlbnRfdXNlciIsImFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lIiwiZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUiLCJjaGVja0xldmVsIiwic2hvd05ld0xldmVsIiwibGV2ZWxzX2NvbnRhaW5lciIsInNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yIiwiZmxpcHBlZF9pdGVtcyIsIndyYXBBbGwiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsImNsb3Nlc3QiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwiY2hhbmdlQW1vdW50UHJldmlldyIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwidGhpc3llYXIiLCJwcmlvcl95ZWFyX2Ftb3VudCIsInByaW9yX3llYXJfY29udHJpYnV0aW9ucyIsImNvbWluZ195ZWFyX2Ftb3VudCIsImNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMiLCJhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCIsIk1hdGgiLCJtYXgiLCJnZXRMZXZlbCIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yIiwibGV2ZWxfdmlld2VyX2NvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJtYXRjaCIsImRlYyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsInRvTG93ZXJDYXNlIiwibWVtYmVyX2xldmVsIiwibGV2ZWxfbmFtZSIsInNlbGVjdGVkIiwicmFuZ2UiLCJtb250aF92YWx1ZSIsInllYXJfdmFsdWUiLCJvbmNlX3ZhbHVlIiwibGV2ZWxfY2xhc3MiLCJzdWJtaXQiLCJhbmFseXRpY3NFdmVudFRyYWNrIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7O0FBQUMsQ0FBQyxVQUFXQSxDQUFYLEVBQWNDLE1BQWQsRUFBc0JDLFFBQXRCLEVBQWlDO0FBQ2xDO0FBQ0EsTUFBSUMsVUFBVSxHQUFHLHNCQUFqQjtBQUFBLE1BQ0FDLFFBQVEsR0FBRztBQUNWQyxJQUFBQSxpQkFBaUIsRUFBRSx5Q0FEVDtBQUVWQyxJQUFBQSxjQUFjLEVBQUUsc0NBRk47QUFHVkMsSUFBQUEsWUFBWSxFQUFFLHdCQUhKO0FBSVZDLElBQUFBLFdBQVcsRUFBRSxRQUpIO0FBS1ZDLElBQUFBLGlCQUFpQixFQUFFLHVCQUxUO0FBTVZDLElBQUFBLFdBQVcsRUFBRTtBQU5ILEdBRFgsQ0FGa0MsQ0FZ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SUFBTCxDQUFVLFlBQVk7QUFDNUIsVUFBSyxDQUFFNUMsQ0FBQyxDQUFDaUQsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZOUMsVUFBMUIsQ0FBUCxFQUFnRDtBQUMvQ0gsUUFBQUEsQ0FBQyxDQUFDaUQsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZOUMsVUFBMUIsRUFBc0MsSUFBSVEsTUFBSixDQUFZLElBQVosRUFBa0JFLE9BQWxCLENBQXRDO0FBQ0E7QUFDRCxLQUpNLENBQVA7QUFLQSxHQU5EO0FBT0EsQ0FsRUEsRUFrRUcyQyxNQWxFSCxFQWtFV3ZELE1BbEVYLEVBa0VtQkMsUUFsRW5CIiwiZmlsZSI6Im1pbm5wb3N0LW1lbWJlcnNoaXAtZnJvbnQtZW5kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCApIHtcblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0QW1vdW50U2VsZWN0Jyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0ZnJlcXVlbmN5U2VsZWN0b3I6ICcubS1mcmVxdWVuY3ktc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0YW1vdW50U2VsZWN0b3I6ICcubS1hbW91bnQtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0YW1vdW50TGFiZWxzOiAnLm0tYW1vdW50LXNlbGVjdCBsYWJlbCcsXG5cdFx0YW1vdW50VmFsdWU6ICdzdHJvbmcnLFxuXHRcdGFtb3VudERlc2NyaXB0aW9uOiAnLmEtYW1vdW50LWRlc2NyaXB0aW9uJyxcblx0XHRhbW91bnRGaWVsZDogJy5hLWFtb3VudC1maWVsZCAjYW1vdW50J1xuXHR9O1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cdFx0aW5pdDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZnJlcXVlbmNpZXMgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKTtcblx0XHRcdHZhciBhbW91bnRzID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yICk7XG5cdFx0XHR2YXIgYW1vdW50ID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICk7XG5cblx0XHRcdHRoaXMuc2V0QW1vdW50TGFiZWxzKCBmcmVxdWVuY2llcy5maWx0ZXIoJzpjaGVja2VkJykudmFsKCkgKTtcblx0XHRcdGZyZXF1ZW5jaWVzLmNoYW5nZSggdGhpcy5vbkZyZXF1ZW5jeUNoYW5nZS5iaW5kKHRoaXMpICk7XG5cdFx0XHRhbW91bnRzLm9uKCAnY2hhbmdlJywgdGhpcy5jbGVhckFtb3VudEZpZWxkLmJpbmQodGhpcykgKTtcblx0XHRcdGFtb3VudC5vbiggJ2tleXVwIG1vdXNldXAnLCB0aGlzLmNsZWFyQW1vdW50U2VsZWN0b3IuYmluZCh0aGlzKSApO1xuXHRcdH0sXG5cblx0XHRvbkZyZXF1ZW5jeUNoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoICQoIGV2ZW50LnRhcmdldCApLnZhbCgpICk7XG5cdFx0fSxcblxuXHRcdHNldEFtb3VudExhYmVsczogZnVuY3Rpb24oIGZyZXF1ZW5jeVN0cmluZyApIHtcblx0XHRcdHZhciBhbW91bnRFbGVtZW50ID0gdGhpcy5vcHRpb25zLmFtb3VudFZhbHVlO1xuXHRcdFx0dmFyIGRlc2NFbGVtZW50ID0gdGhpcy5vcHRpb25zLmFtb3VudERlc2NyaXB0aW9uO1xuXHRcdFx0dmFyIGxhYmVscyA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRMYWJlbHMgKTtcblx0XHRcdHZhciB0eXBlQW5kRnJlcXVlbmN5O1xuXHRcdFx0dmFyIHR5cGU7XG5cdFx0XHR2YXIgZnJlcXVlbmN5O1xuXG5cdFx0XHRpZiAoIGxhYmVscy5sZW5ndGggPCAwIHx8IHR5cGVvZiBmcmVxdWVuY3lTdHJpbmcgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHR5cGVBbmRGcmVxdWVuY3kgPSBmcmVxdWVuY3lTdHJpbmcuc3BsaXQoJyAtICcpO1xuXHRcdFx0dHlwZSA9IHR5cGVBbmRGcmVxdWVuY3lbMF07XG5cdFx0XHRmcmVxdWVuY3kgPSBwYXJzZUludCggdHlwZUFuZEZyZXF1ZW5jeVsxXSwgMTAgKTtcblxuXHRcdFx0bGFiZWxzLmVhY2goIGZ1bmN0aW9uKCBpbmRleCApIHtcblx0XHRcdFx0dmFyICRsYWJlbCA9ICQoIHRoaXMgKTtcblx0XHRcdFx0dmFyICRhbW91bnQgPSAkKCAnIycgKyAkbGFiZWwuYXR0ciggJ2ZvcicgKSApO1xuXHRcdFx0XHR2YXIgYW1vdW50ID0gcGFyc2VJbnQoICRsYWJlbC5kYXRhKCAnbW9udGhseS1hbW91bnQnICksIDEwICk7XG5cdFx0XHRcdHZhciBuZXdBbW91bnQgPSB0eXBlID09PSAncGVyIHllYXInID8gYW1vdW50ICogMTIgOiBhbW91bnQ7XG5cdFx0XHRcdHZhciBhbW91bnRUZXh0ID0gJyQnICsgbmV3QW1vdW50O1xuXHRcdFx0XHR2YXIgZGVzYyA9ICRsYWJlbC5kYXRhKCB0eXBlID09PSAncGVyIHllYXInID8gJ3llYXJseS1kZXNjJyA6ICdtb250aGx5LWRlc2MnICk7XG5cblx0XHRcdFx0JGFtb3VudC52YWwoIG5ld0Ftb3VudCApO1xuXHRcdFx0XHQkKCB0aGlzICkuZmluZCggYW1vdW50RWxlbWVudCApLnRleHQoIGFtb3VudFRleHQgKVxuXHRcdFx0XHQkKCB0aGlzICkuZmluZCggZGVzY0VsZW1lbnQgKS50ZXh0KCBkZXNjICk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgc2V0QW1vdW50TGFiZWxzXG5cblx0XHRjbGVhckFtb3VudFNlbGVjdG9yOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgYW1vdW50cyA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApO1xuXG5cdFx0XHRpZiAoICQoIGV2ZW50LnRhcmdldCApLnZhbCgpID09PSAnJyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRhbW91bnRzLnJlbW92ZUF0dHIoJ2NoZWNrZWQnKTtcblx0XHR9LFxuXG5cdFx0Y2xlYXJBbW91bnRGaWVsZDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0JCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICkudmFsKCBudWxsICk7XG5cdFx0fSxcblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCApO1xuIiwiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBiZW5lZml0Rm9ybSgpIHtcblx0XHRpZiAoIDIgPT09IHBlcmZvcm1hbmNlLm5hdmlnYXRpb24udHlwZSApIHtcblx0XHQgICBsb2NhdGlvbi5yZWxvYWQoIHRydWUgKTtcblx0XHR9XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uLmEtYnV0dG9uLWRpc2FibGVkJyApLnJlbW92ZUF0dHIoICdkaXNhYmxlZCcgKTtcblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR2YXIgJGJ1dHRvbiAgPSAkKCB0aGlzICk7XG5cdFx0XHR2YXIgJHN0YXR1cyAgPSAkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJywgJCggdGhpcyApLnBhcmVudCgpICk7XG5cdFx0XHR2YXIgJHNlbGVjdCAgPSAkKCAnc2VsZWN0JywgJCggdGhpcyApLnBhcmVudCgpICk7XG5cdFx0XHR2YXIgc2V0dGluZ3MgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzO1xuXHRcdFx0Ly8gcmVzZXQgdGhlIG1lc3NhZ2UgZm9yIGN1cnJlbnQgc3RhdHVzXG5cdFx0XHRpZiAoICEgJy5tLWJlbmVmaXQtbWVzc2FnZS1zdWNjZXNzJyApIHtcblx0XHRcdFx0JCggJy5tLWJlbmVmaXQtbWVzc2FnZScgKS5yZW1vdmVDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgbS1iZW5lZml0LW1lc3NhZ2UtZXJyb3IgbS1iZW5lZml0LW1lc3NhZ2UtaW5mbycgKTtcblx0XHRcdH1cblx0XHRcdC8vIHNldCBidXR0b24gdG8gcHJvY2Vzc2luZ1xuXHRcdFx0JGJ1dHRvbi50ZXh0KCAnUHJvY2Vzc2luZycgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXG5cdFx0XHQvLyBkaXNhYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLmFkZENsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cblx0XHRcdC8vIHNldCBhamF4IGRhdGFcblx0XHRcdHZhciBkYXRhID0ge307XG5cdFx0XHR2YXIgYmVuZWZpdFR5cGUgPSAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScgKS52YWwoKTtcblx0XHRcdGlmICggJ3BhcnRuZXItb2ZmZXJzJyA9PT0gYmVuZWZpdFR5cGUgKSB7XG5cdFx0XHQgICAgZGF0YSA9IHtcblx0XHRcdCAgICAgICAgJ2FjdGlvbicgOiAnYmVuZWZpdF9mb3JtX3N1Ym1pdCcsXG5cdFx0XHQgICAgICAgICdtaW5ucG9zdF9tZW1iZXJzaGlwX2JlbmVmaXRfZm9ybV9ub25jZScgOiAkYnV0dG9uLmRhdGEoICdiZW5lZml0LW5vbmNlJyApLFxuXHRcdFx0ICAgICAgICAnY3VycmVudF91cmwnIDogJCggJ2lucHV0W25hbWU9XCJjdXJyZW50X3VybFwiXScpLnZhbCgpLFxuXHRcdFx0ICAgICAgICAnYmVuZWZpdC1uYW1lJzogJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nKS52YWwoKSxcblx0XHRcdCAgICAgICAgJ2luc3RhbmNlX2lkJyA6ICQoICdbbmFtZT1cImluc3RhbmNlLWlkLScgKyAkYnV0dG9uLnZhbCgpICsgJ1wiXScgKS52YWwoKSxcblx0XHRcdCAgICAgICAgJ3Bvc3RfaWQnIDogJGJ1dHRvbi52YWwoKSxcblx0XHRcdCAgICAgICAgJ2lzX2FqYXgnIDogJzEnLFxuXHRcdFx0ICAgIH07XG5cblx0XHRcdCAgICAkLnBvc3QoIHNldHRpbmdzLmFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdCAgICBcdC8vIHN1Y2Nlc3Ncblx0XHRcdFx0ICAgIGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0ICAgIFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdCAgICBcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdCAgICBcdCRzdGF0dXMuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuYWRkQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3MgKTtcblx0XHRcdFx0ICAgIFx0aWYgKCAwIDwgJHNlbGVjdC5sZW5ndGggKSB7XG5cdFx0XHRcdCAgICBcdFx0JHNlbGVjdC5wcm9wKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdFx0XHRcdCAgICBcdH1cblx0XHRcdFx0ICAgIFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS5hdHRyKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdFx0XHRcdCAgICB9IGVsc2Uge1xuXHRcdFx0XHQgICAgXHQvLyBlcnJvclxuXHRcdFx0XHQgICAgXHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0ICAgIFx0aWYgKCAndW5kZWZpbmVkJyA9PT0gdHlwZW9mIHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlICkge1xuXHRcdFx0XHRcdCAgICBcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdCAgICBcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHQgICAgXHR9XG5cdFx0XHRcdFx0ICAgIH0gZWxzZSB7XG5cdFx0XHRcdCAgICBcdFx0JCggJ29wdGlvbicsICRzZWxlY3QgKS5lYWNoKCBmdW5jdGlvbiggaSApIHtcblx0XHRcdFx0ICAgIFx0XHRcdGlmICggJCggdGhpcyApLnZhbCgpID09PSByZXNwb25zZS5kYXRhLnJlbW92ZV9pbnN0YW5jZV92YWx1ZSApIHtcblx0XHRcdFx0ICAgIFx0XHRcdFx0JCggdGhpcyApLnJlbW92ZSgpO1xuXHRcdFx0XHQgICAgXHRcdFx0fVxuXHRcdFx0XHQgICAgXHRcdH0pO1xuXHRcdFx0XHQgICAgXHRcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdCAgICBcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ICAgIFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHQgICAgXHR9XG5cdFx0XHRcdCAgICBcdH1cblx0XHRcdFx0ICAgIFx0Ly8gcmUtZW5hYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0XHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cdFx0XHRcdCAgICBcdCRzdGF0dXMuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuYWRkQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3MgKTtcblx0XHRcdFx0ICAgIH1cblxuXHRcdFx0XHR9KTtcblx0XHQgICAgfVxuXHRcdH0pO1xuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCAwIDwgJCggJy5tLWZvcm0tbWVtYmVyc2hpcC1iZW5lZml0JyApLmxlbmd0aCApIHtcblx0XHRcdGJlbmVmaXRGb3JtKCk7XG5cdFx0fVxuXHR9KTtcblxuXHQkKCAnLmEtcmVmcmVzaC1wYWdlJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRsb2NhdGlvbi5yZWxvYWQoKTtcblx0fSk7XG5cbn0gKSggalF1ZXJ5ICk7XG4iLCIoIGZ1bmN0aW9uKCAkICkge1xuXHRmdW5jdGlvbiBtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCggdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICkge1xuXHRcdGlmICggdHlwZW9mIGdhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdGlmICggdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7IFxuXHRcdCQoICcubS1zdXBwb3J0LWN0YS10b3AgLmEtc3VwcG9ydC1idXR0b24nICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciB2YWx1ZSA9ICcnO1xuXHRcdFx0aWYgKCAkKCAnc3ZnJywgJCggdGhpcyApICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0dmFsdWUgPSAkKCAnc3ZnJywgJCggdGhpcyApICkuYXR0ciggJ3RpdGxlJyApICsgJyAnO1xuXHRcdFx0fVxuXHRcdFx0dmFsdWUgPSB2YWx1ZSArICQoIHRoaXMgKS50ZXh0KCk7XG5cdFx0XHRtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCggJ2V2ZW50JywgJ1N1cHBvcnQgQ1RBIC0gSGVhZGVyJywgJ0NsaWNrOiAnICsgdmFsdWUsIGxvY2F0aW9uLnBhdGhuYW1lICk7XG5cdFx0fSk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgdW5kZWZpbmVkICkge1xuXG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHQnZGVidWcnIDogZmFsc2UsIC8vIHRoaXMgY2FuIGJlIHNldCB0byB0cnVlIG9uIHBhZ2UgbGV2ZWwgb3B0aW9uc1xuXHRcdCdhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZScgOiAnI2Ftb3VudC1pdGVtICNhbW91bnQnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZScgOiAnLm0tbWVtYmVyc2hpcC1mYXN0LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdCdsZXZlbF92aWV3ZXJfY29udGFpbmVyJyA6ICcuYS1zaG93LWxldmVsJyxcblx0XHQnbGV2ZWxfbmFtZScgOiAnLmEtbGV2ZWwnLFxuXHRcdCd1c2VyX2N1cnJlbnRfbGV2ZWwnIDogJy5hLWN1cnJlbnQtbGV2ZWwnLFxuXHRcdCd1c2VyX25ld19sZXZlbCcgOiAnLmEtbmV3LWxldmVsJyxcblx0XHQnYW1vdW50X3ZpZXdlcicgOiAnLmFtb3VudCBoMycsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hLWZvcm0taXRlbS1tZW1iZXJzaGlwLWZyZXF1ZW5jeScsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHNfdHlwZScgOiAnc2VsZWN0Jyxcblx0XHQnbGV2ZWxzX2NvbnRhaW5lcicgOiAnLm8tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWxzJyxcblx0XHQnc2luZ2xlX2xldmVsX2NvbnRhaW5lcicgOiAnLm0tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWwnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcicgOiAnLm0tbWVtYmVyLWxldmVsLWJyaWVmJyxcblx0XHQnZmxpcHBlZF9pdGVtcycgOiAnZGl2LmFtb3VudCwgZGl2LmVudGVyJyxcblx0XHQnbGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3InIDogJy5zaG93LWZyZXF1ZW5jeScsXG5cdFx0J2Nob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYW1vdW50IC5hLWJ1dHRvbi1mbGlwJyxcblx0XHQnYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmVudGVyIGlucHV0LmFtb3VudC1lbnRyeScsXG5cdH07IC8vIGVuZCBkZWZhdWx0c1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblxuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblxuXHRcdGluaXQ6IGZ1bmN0aW9uKCByZXNldCwgYW1vdW50ICkge1xuXHRcdFx0Ly8gUGxhY2UgaW5pdGlhbGl6YXRpb24gbG9naWMgaGVyZVxuXHRcdFx0Ly8gWW91IGFscmVhZHkgaGF2ZSBhY2Nlc3MgdG8gdGhlIERPTSBlbGVtZW50IGFuZFxuXHRcdFx0Ly8gdGhlIG9wdGlvbnMgdmlhIHRoZSBpbnN0YW5jZSwgZS5nLiB0aGlzLmVsZW1lbnRcblx0XHRcdC8vIGFuZCB0aGlzLm9wdGlvbnNcblx0XHRcdC8vIHlvdSBjYW4gYWRkIG1vcmUgZnVuY3Rpb25zIGxpa2UgdGhlIG9uZSBiZWxvdyBhbmRcblx0XHRcdC8vIGNhbGwgdGhlbSBsaWtlIHNvOiB0aGlzLnlvdXJPdGhlckZ1bmN0aW9uKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKS5cblx0XHRcdHRoaXMuY2F0Y2hIYXNoTGlua3MoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKTtcblx0XHRcdHRoaXMubGV2ZWxGbGlwcGVyKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdFx0dGhpcy5zdGFydExldmVsQ2xpY2soIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0fSxcblxuXHRcdGNhdGNoSGFzaExpbmtzOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJ2FbaHJlZio9XCIjXCJdOm5vdChbaHJlZj1cIiNcIl0pJywgZWxlbWVudCkuY2xpY2soZnVuY3Rpb24oZSkge1xuXHRcdFx0ICAgIHZhciB0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblx0XHRcdCAgICBpZiAodGFyZ2V0LnBhcmVudCgnLmNvbW1lbnQtdGl0bGUnKS5sZW5ndGggPT0gMCAmJiBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgPT0gdGhpcy5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgJiYgbG9jYXRpb24uaG9zdG5hbWUgPT0gdGhpcy5ob3N0bmFtZSkge1xuXHRcdFx0XHQgICAgdmFyIHRhcmdldCA9ICQodGhpcy5oYXNoKTtcblx0XHRcdFx0ICAgIHRhcmdldCA9IHRhcmdldC5sZW5ndGggPyB0YXJnZXQgOiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsnXScpO1xuXHRcdFx0XHRcdGlmICh0YXJnZXQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQkKCdodG1sLGJvZHknKS5hbmltYXRlKHtcblx0XHRcdFx0XHRcdFx0c2Nyb2xsVG9wOiB0YXJnZXQub2Zmc2V0KCkudG9wXG5cdFx0XHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbEZsaXBwZXI6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIHByZXZpb3VzX2Ftb3VudCA9ICcnO1xuXHRcdFx0dmFyIGFtb3VudCA9IDA7XG5cdFx0XHR2YXIgbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSAwO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3kgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9ICcnO1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyAmJiAkKCBvcHRpb25zLnVzZXJfY3VycmVudF9sZXZlbCApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdHByZXZpb3VzX2Ftb3VudCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50O1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkubGVuZ3RoID4gMCAmJlxuXHRcdFx0ICAgICAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpO1xuXHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKCk7XG5cdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHQgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cblx0XHRcdCAgICAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUpLmNoYW5nZSggZnVuY3Rpb24oKSB7XG5cblx0XHRcdCAgICBcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKClcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHQgICAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpLCAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJyApLmF0dHIoICdkYXRhLXllYXItZnJlcXVlbmN5JyApLCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdCAgICB9KTtcblxuXHRcdFx0ICAgICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSkuYmluZCgna2V5dXAgbW91c2V1cCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0ICAgIFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKyAnOmNoZWNrZWQnKS52YWwoKVxuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHQgICAgICBpZigkKHRoaXMpLmRhdGEoJ2xhc3QtdmFsdWUnKSAhPSAkKHRoaXMpLnZhbCgpKSB7XG5cdFx0XHQgICAgICAgICQodGhpcykuZGF0YSgnbGFzdC12YWx1ZScsICQodGhpcykudmFsKCkpO1xuXHRcdFx0ICAgICAgICBsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLnZhbCgpLCAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJyApLmF0dHIoICdkYXRhLXllYXItZnJlcXVlbmN5JyApLCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHQgICAgICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXHRcdFx0ICAgICAgfTtcblx0XHRcdCAgICB9KTtcblxuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmxldmVsc19jb250YWluZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50ICkuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmZsaXBwZWRfaXRlbXMsICQodGhpcykgKS53cmFwQWxsKCAnPGRpdiBjbGFzcz1cImZsaXBwZXJcIi8+JyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkub24oJ2NoYW5nZScsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQodGhpcykuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKHRoaXMpLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdCAgICBpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBmcmVxdWVuY3kgPT0gMSApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQteWVhcmx5JyApICk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3kgPT0gMTIgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LW1vbnRobHknICkgKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXG5cdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlRnJlcXVlbmN5KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAkKCBvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciwgZWxlbWVudCkudGV4dChmcmVxdWVuY3lfbmFtZSk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS52YWwoKTtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dGhhdC5jaGFuZ2VBbW91bnRQcmV2aWV3KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykucGFyZW50KCkgKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGxldmVsRmxpcHBlclxuXG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0ICB2YXIgdGhpc3llYXIgPSBwYXJzZUludCggYW1vdW50ICkgKiBwYXJzZUludCggZnJlcXVlbmN5ICk7XG5cdFx0ICB2YXIgbGV2ZWwgPSAnJztcblx0XHQgIGlmICggdHlwZW9mIHByZXZpb3VzX2Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJldmlvdXNfYW1vdW50ICE9PSAnJyApIHtcblx0XHQgICAgdmFyIHByaW9yX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5wcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMgKTtcblx0XHQgICAgdmFyIGNvbWluZ195ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQuY29taW5nX3llYXJfY29udHJpYnV0aW9ucyApO1xuXHRcdCAgICB2YXIgYW5udWFsX3JlY3VycmluZ19hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LmFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0ICAgIC8vIGNhbGN1bGF0ZSBtZW1iZXIgbGV2ZWwgZm9ybXVsYVxuXHRcdCAgICBpZiAoIHR5cGUgPT09ICdvbmUtdGltZScgKSB7XG5cdFx0ICAgICAgcHJpb3JfeWVhcl9hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0ICAgIH0gZWxzZSB7XG5cdFx0ICAgICAgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0ICAgIH1cblxuXHRcdCAgICB0aGlzeWVhciA9IE1hdGgubWF4KCBwcmlvcl95ZWFyX2Ftb3VudCwgY29taW5nX3llYXJfYW1vdW50LCBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdCAgfVxuXG5cdFx0ICBsZXZlbCA9IHRoaXMuZ2V0TGV2ZWwoIHRoaXN5ZWFyICk7XG5cblx0XHQgICQoJ2gyJywgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0ICAgIGlmICggJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWxbJ25hbWUnXSApIHtcblx0XHQgICAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdCAgICAgICQodGhpcykucGFyZW50KCkucGFyZW50KCkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0ICAgIH1cblx0XHQgIH0gKTtcblx0XHQgIHJldHVybiBsZXZlbDtcblxuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRnZXRMZXZlbDogZnVuY3Rpb24oIHRoaXN5ZWFyICkge1xuXHRcdFx0dmFyIGxldmVsID0gW107XG5cdFx0XHRpZiAoIHRoaXN5ZWFyID4gMCAmJiB0aGlzeWVhciA8IDYwICkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0Jyb256ZSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDE7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0aGlzeWVhciA+IDU5ICYmIHRoaXN5ZWFyIDwgMTIwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnU2lsdmVyJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMjtcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAxMTkgJiYgdGhpc3llYXIgPCAyNDApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdHb2xkJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMztcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAyMzkpIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdQbGF0aW51bSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGdldExldmVsXG5cblx0XHRzaG93TmV3TGV2ZWw6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApIHtcblx0XHRcdHZhciBtZW1iZXJfbGV2ZWxfcHJlZml4ID0gJyc7XG5cdFx0XHR2YXIgb2xkX2xldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciA9IG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcjsgLy8gdGhpcyBzaG91bGQgY2hhbmdlIHdoZW4gd2UgcmVwbGFjZSB0aGUgdGV4dCwgaWYgdGhlcmUgaXMgYSBsaW5rIGluc2lkZSBpdFxuXHRcdFx0dmFyIGRlY29kZUh0bWxFbnRpdHkgPSBmdW5jdGlvbiggc3RyICkge1xuXHRcdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoIC8mIyhcXGQrKTsvZywgZnVuY3Rpb24oIG1hdGNoLCBkZWMgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoIGRlYyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRtZW1iZXJfbGV2ZWxfcHJlZml4ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLm1lbWJlcl9sZXZlbF9wcmVmaXg7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcikucHJvcCggJ2NsYXNzJywgJ2Etc2hvdy1sZXZlbCBhLXNob3ctbGV2ZWwtJyArIGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApO1xuXG5cdFx0XHRcdGlmICggJCggb3B0aW9ucy51c2VyX2N1cnJlbnRfbGV2ZWwgKS5sZW5ndGggPiAwICYmIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0XHRpZiAoICdhJywgJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgPSBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKyAnIGEnO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG9sZF9sZXZlbCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLnJlcGxhY2UoIG1lbWJlcl9sZXZlbF9wcmVmaXgsICcnICk7XG5cblx0XHRcdFx0XHRpZiAoIG9sZF9sZXZlbCAhPT0gbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICkge1xuXHRcdFx0XHRcdFx0JCggbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmRhdGEoICdjaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmRhdGEoICdub3QtY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0JChvcHRpb25zLmxldmVsX25hbWUsIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcikudGV4dCggbGV2ZWxbJ25hbWUnXSApO1xuXHRcdFx0fVxuXG5cdFx0fSwgLy8gZW5kIHNob3dOZXdMZXZlbFxuXG5cdFx0Y2hhbmdlRnJlcXVlbmN5OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHQgICAgdmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0ICAgIHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHQgICAgdmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3kgICAgICA9IHBhcnNlSW50KCBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMV0gKTtcblxuXHRcdFx0ICAgICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnZhbCggc2VsZWN0ZWQgKTtcbiAgICBcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5wcm9wKCAnc2VsZWN0ZWQnLCBzZWxlY3RlZCApO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG4gICAgXHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkuZGF0YSggJ2ZyZXF1ZW5jeScsIGZyZXF1ZW5jeSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUZyZXF1ZW5jeVxuXG5cdFx0Y2hhbmdlQW1vdW50UHJldmlldzogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0ICAgIHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdCAgICB2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUFtb3VudFByZXZpZXdcblxuXHRcdHN0YXJ0TGV2ZWxDbGljazogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCcuc3RhcnQtbGV2ZWwnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGxldmVsX2NsYXNzID0gJCggdGhpcyApLnByb3AoICdjbGFzcycgKTtcblx0XHRcdFx0dmFyIGxldmVsX251bWJlciA9IGxldmVsX2NsYXNzW2xldmVsX2NsYXNzLmxlbmd0aCAtMV07XG5cdFx0XHQgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciwgZWxlbWVudCApLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciArICcgJyArIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHQgIH0pO1xuXHRcdH0sIC8vIGVuZCBzdGFydExldmVsQ2xpY2tcblxuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xuXG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50ICk7XG4iLCIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50ICkge1xuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RUcmFja1N1Ym1pdCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdHR5cGU6ICdldmVudCcsXG5cdFx0Y2F0ZWdvcnk6ICdTdXBwb3J0IFVzJyxcblx0XHRhY3Rpb246ICdCZWNvbWUgQSBNZW1iZXInLFxuXHRcdGxhYmVsOiBsb2NhdGlvbi5wYXRobmFtZVxuXHR9O1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG5cblx0XHRcdCQoIHRoaXMuZWxlbWVudCApLnN1Ym1pdCggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHR0aGF0LmFuYWx5dGljc0V2ZW50VHJhY2soXG5cdFx0XHRcdFx0b3B0aW9ucy50eXBlLFxuXHRcdFx0XHRcdG9wdGlvbnMuY2F0ZWdvcnksXG5cdFx0XHRcdFx0b3B0aW9ucy5hY3Rpb24sXG5cdFx0XHRcdFx0b3B0aW9ucy5sYWJlbFxuXHRcdFx0XHQpO1xuXHRcdFx0XHQvLyBhbHNvIGJ1YmJsZXMgdGhlIGV2ZW50IHVwIHRvIHN1Ym1pdCB0aGUgZm9ybVxuXHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdGFuYWx5dGljc0V2ZW50VHJhY2s6IGZ1bmN0aW9uKCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKSB7XG5cdFx0XHRpZiAoIHR5cGVvZiBnYSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApO1xuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NFdmVudFRyYWNrXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQgKTtcbiJdfQ==
