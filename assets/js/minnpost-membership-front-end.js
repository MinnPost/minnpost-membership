"use strict";

// plugin
;

(function ($, window, document) {
  // Create the defaults once
  var pluginName = 'minnpostAmountSelect',
      defaults = {
    frequencySelector: '.m-frequency-select input[type="radio"]',
    amountSelector: '.m-amount-select',
    amountLabels: '.m-amount-select label',
    amountValue: 'strong',
    amountDescription: '.a-amount-description'
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
      var amount = $(this.element).find(this.options.amountSelector);
      this.setAmountLabels(frequencies.filter(':checked').val());
      $(frequencies).change(this.onFrequencyChange.bind(this));
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFtb3VudC1zZWxlY3QuanMiLCJiZW5lZml0cy5qcyIsImN0YS5qcyIsIm1lbWJlci1sZXZlbHMuanMiLCJ0cmFjay1zdWJtaXQuanMiXSwibmFtZXMiOlsiJCIsIndpbmRvdyIsImRvY3VtZW50IiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiZnJlcXVlbmN5U2VsZWN0b3IiLCJhbW91bnRTZWxlY3RvciIsImFtb3VudExhYmVscyIsImFtb3VudFZhbHVlIiwiYW1vdW50RGVzY3JpcHRpb24iLCJQbHVnaW4iLCJlbGVtZW50Iiwib3B0aW9ucyIsImV4dGVuZCIsIl9kZWZhdWx0cyIsIl9uYW1lIiwiaW5pdCIsInByb3RvdHlwZSIsImZyZXF1ZW5jaWVzIiwiZmluZCIsImFtb3VudCIsInNldEFtb3VudExhYmVscyIsImZpbHRlciIsInZhbCIsImNoYW5nZSIsIm9uRnJlcXVlbmN5Q2hhbmdlIiwiYmluZCIsImV2ZW50IiwidGFyZ2V0IiwiZnJlcXVlbmN5U3RyaW5nIiwiYW1vdW50RWxlbWVudCIsImRlc2NFbGVtZW50IiwibGFiZWxzIiwidHlwZUFuZEZyZXF1ZW5jeSIsInR5cGUiLCJmcmVxdWVuY3kiLCJsZW5ndGgiLCJzcGxpdCIsInBhcnNlSW50IiwiZWFjaCIsImluZGV4IiwiJGxhYmVsIiwiYXR0ciIsImFtb3VudFRleHQiLCJkZXNjIiwiZGF0YSIsInRleHQiLCJmbiIsImpRdWVyeSIsImJlbmVmaXRGb3JtIiwicGVyZm9ybWFuY2UiLCJuYXZpZ2F0aW9uIiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZW1vdmVBdHRyIiwiY2xpY2siLCJwcmV2ZW50RGVmYXVsdCIsIiRidXR0b24iLCIkc3RhdHVzIiwicGFyZW50IiwiJHNlbGVjdCIsInNldHRpbmdzIiwibWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncyIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJiZW5lZml0VHlwZSIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwiYnV0dG9uX3ZhbHVlIiwiYnV0dG9uX2xhYmVsIiwiYnV0dG9uX2NsYXNzIiwicHJvcCIsImJ1dHRvbl9hdHRyIiwiaHRtbCIsIm1lc3NhZ2UiLCJtZXNzYWdlX2NsYXNzIiwibm90IiwicmVtb3ZlX2luc3RhbmNlX3ZhbHVlIiwic2hvdyIsImhpZGUiLCJpIiwicmVtb3ZlIiwicmVhZHkiLCJtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCIsImNhdGVnb3J5IiwiYWN0aW9uIiwibGFiZWwiLCJ2YWx1ZSIsImdhIiwicGF0aG5hbWUiLCJ1bmRlZmluZWQiLCJyZXNldCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwiZSIsInJlcGxhY2UiLCJob3N0bmFtZSIsImhhc2giLCJzbGljZSIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwicHJldmlvdXNfYW1vdW50IiwibGV2ZWwiLCJsZXZlbF9udW1iZXIiLCJmcmVxdWVuY3lfc3RyaW5nIiwiZnJlcXVlbmN5X25hbWUiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJ1c2VyX2N1cnJlbnRfbGV2ZWwiLCJjdXJyZW50X3VzZXIiLCJhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lIiwiY2hlY2tMZXZlbCIsInNob3dOZXdMZXZlbCIsImxldmVsc19jb250YWluZXIiLCJzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciIsImZsaXBwZWRfaXRlbXMiLCJ3cmFwQWxsIiwiZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyIsIm9uIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsImNsb3Nlc3QiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwiY2hhbmdlQW1vdW50UHJldmlldyIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwidGhpc3llYXIiLCJwcmlvcl95ZWFyX2Ftb3VudCIsInByaW9yX3llYXJfY29udHJpYnV0aW9ucyIsImNvbWluZ195ZWFyX2Ftb3VudCIsImNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMiLCJhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCIsIk1hdGgiLCJtYXgiLCJnZXRMZXZlbCIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yIiwibGV2ZWxfdmlld2VyX2NvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJtYXRjaCIsImRlYyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsInRvTG93ZXJDYXNlIiwibWVtYmVyX2xldmVsIiwibGV2ZWxfbmFtZSIsInNlbGVjdGVkIiwicmFuZ2UiLCJtb250aF92YWx1ZSIsInllYXJfdmFsdWUiLCJvbmNlX3ZhbHVlIiwibGV2ZWxfY2xhc3MiLCJzdWJtaXQiLCJhbmFseXRpY3NFdmVudFRyYWNrIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7O0FBQUMsQ0FBQyxVQUFXQSxDQUFYLEVBQWNDLE1BQWQsRUFBc0JDLFFBQXRCLEVBQWlDO0FBQ2xDO0FBQ0EsTUFBSUMsVUFBVSxHQUFHLHNCQUFqQjtBQUFBLE1BQ0FDLFFBQVEsR0FBRztBQUNWQyxJQUFBQSxpQkFBaUIsRUFBRSx5Q0FEVDtBQUVWQyxJQUFBQSxjQUFjLEVBQUUsa0JBRk47QUFHVkMsSUFBQUEsWUFBWSxFQUFFLHdCQUhKO0FBSVZDLElBQUFBLFdBQVcsRUFBRSxRQUpIO0FBS1ZDLElBQUFBLGlCQUFpQixFQUFFO0FBTFQsR0FEWCxDQUZrQyxDQVdsQzs7QUFDQSxXQUFTQyxNQUFULENBQWlCQyxPQUFqQixFQUEwQkMsT0FBMUIsRUFBb0M7QUFDbkMsU0FBS0QsT0FBTCxHQUFlQSxPQUFmLENBRG1DLENBR25DO0FBQ0E7QUFDQTtBQUNBOztBQUNBLFNB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QUFLNUMsVUFBTCxJQUFtQixVQUFXUyxPQUFYLEVBQXFCO0FBQ3ZDLFdBQU8sS0FBSzJCLElBQUwsQ0FBVSxZQUFZO0FBQzVCLFVBQUssQ0FBRXZDLENBQUMsQ0FBQzZDLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWTFDLFVBQTFCLENBQVAsRUFBZ0Q7QUFDL0NILFFBQUFBLENBQUMsQ0FBQzZDLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWTFDLFVBQTFCLEVBQXNDLElBQUlPLE1BQUosQ0FBWSxJQUFaLEVBQWtCRSxPQUFsQixDQUF0QztBQUNBO0FBQ0QsS0FKTSxDQUFQO0FBS0EsR0FORDtBQU9BLENBbEVBLEVBa0VHb0MsTUFsRUgsRUFrRVcvQyxNQWxFWCxFQWtFbUJDLFFBbEVuQiIsImZpbGUiOiJtaW5ucG9zdC1tZW1iZXJzaGlwLWZyb250LWVuZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQgKSB7XG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdEFtb3VudFNlbGVjdCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdGZyZXF1ZW5jeVNlbGVjdG9yOiAnLm0tZnJlcXVlbmN5LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGFtb3VudFNlbGVjdG9yOiAnLm0tYW1vdW50LXNlbGVjdCcsXG5cdFx0YW1vdW50TGFiZWxzOiAnLm0tYW1vdW50LXNlbGVjdCBsYWJlbCcsXG5cdFx0YW1vdW50VmFsdWU6ICdzdHJvbmcnLFxuXHRcdGFtb3VudERlc2NyaXB0aW9uOiAnLmEtYW1vdW50LWRlc2NyaXB0aW9uJ1xuXHR9O1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cdFx0aW5pdDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZnJlcXVlbmNpZXMgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKTtcblx0XHRcdHZhciBhbW91bnQgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKTtcblxuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoIGZyZXF1ZW5jaWVzLmZpbHRlcignOmNoZWNrZWQnKS52YWwoKSApO1xuXHRcdFx0JCggZnJlcXVlbmNpZXMgKS5jaGFuZ2UoIHRoaXMub25GcmVxdWVuY3lDaGFuZ2UuYmluZCh0aGlzKSApO1xuXHRcdH0sXG5cblx0XHRvbkZyZXF1ZW5jeUNoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoICQoIGV2ZW50LnRhcmdldCApLnZhbCgpICk7XG5cdFx0fSxcblxuXHRcdHNldEFtb3VudExhYmVsczogZnVuY3Rpb24oIGZyZXF1ZW5jeVN0cmluZyApIHtcblx0XHRcdHZhciBhbW91bnRFbGVtZW50ID0gdGhpcy5vcHRpb25zLmFtb3VudFZhbHVlO1xuXHRcdFx0dmFyIGRlc2NFbGVtZW50ID0gdGhpcy5vcHRpb25zLmFtb3VudERlc2NyaXB0aW9uO1xuXHRcdFx0dmFyIGxhYmVscyA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRMYWJlbHMgKTtcblx0XHRcdHZhciB0eXBlQW5kRnJlcXVlbmN5O1xuXHRcdFx0dmFyIHR5cGU7XG5cdFx0XHR2YXIgZnJlcXVlbmN5O1xuXG5cdFx0XHRpZiAoIGxhYmVscy5sZW5ndGggPCAwIHx8IHR5cGVvZiBmcmVxdWVuY3lTdHJpbmcgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHR5cGVBbmRGcmVxdWVuY3kgPSBmcmVxdWVuY3lTdHJpbmcuc3BsaXQoJyAtICcpO1xuXHRcdFx0dHlwZSA9IHR5cGVBbmRGcmVxdWVuY3lbMF07XG5cdFx0XHRmcmVxdWVuY3kgPSBwYXJzZUludCggdHlwZUFuZEZyZXF1ZW5jeVsxXSwgMTAgKTtcblxuXHRcdFx0bGFiZWxzLmVhY2goIGZ1bmN0aW9uKCBpbmRleCApIHtcblx0XHRcdFx0dmFyICRsYWJlbCA9ICQoIHRoaXMgKTtcblx0XHRcdFx0dmFyIGFtb3VudCA9IHBhcnNlSW50KCAkKCAnIycgKyAkbGFiZWwuYXR0ciggJ2ZvcicgKSApLnZhbCgpLCAxMCApO1xuXHRcdFx0XHR2YXIgYW1vdW50VGV4dCA9ICckJyArICggdHlwZSA9PT0gJ3BlciB5ZWFyJyA/IGFtb3VudCAqIDEyIDogYW1vdW50KTtcblx0XHRcdFx0dmFyIGRlc2MgPSAkbGFiZWwuZGF0YSggdHlwZSA9PT0gJ3BlciB5ZWFyJyA/ICd5ZWFybHktZGVzYycgOiAnbW9udGhseS1kZXNjJyApO1xuXG5cdFx0XHRcdCQoIHRoaXMgKS5maW5kKCBhbW91bnRFbGVtZW50ICkudGV4dCggYW1vdW50VGV4dCApXG5cdFx0XHRcdCQoIHRoaXMgKS5maW5kKCBkZXNjRWxlbWVudCApLnRleHQoIGRlc2MgKTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQgKTtcbiIsIiggZnVuY3Rpb24oICQgKSB7XG5cblx0ZnVuY3Rpb24gYmVuZWZpdEZvcm0oKSB7XG5cdFx0aWYgKCAyID09PSBwZXJmb3JtYW5jZS5uYXZpZ2F0aW9uLnR5cGUgKSB7XG5cdFx0ICAgbG9jYXRpb24ucmVsb2FkKCB0cnVlICk7XG5cdFx0fVxuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbi5hLWJ1dHRvbi1kaXNhYmxlZCcgKS5yZW1vdmVBdHRyKCAnZGlzYWJsZWQnICk7XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0dmFyICRidXR0b24gID0gJCggdGhpcyApO1xuXHRcdFx0dmFyICRzdGF0dXMgID0gJCggJy5tLWJlbmVmaXQtbWVzc2FnZScsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyICRzZWxlY3QgID0gJCggJ3NlbGVjdCcsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyIHNldHRpbmdzID0gbWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncztcblx0XHRcdC8vIHJlc2V0IHRoZSBtZXNzYWdlIGZvciBjdXJyZW50IHN0YXR1c1xuXHRcdFx0aWYgKCAhICcubS1iZW5lZml0LW1lc3NhZ2Utc3VjY2VzcycgKSB7XG5cdFx0XHRcdCQoICcubS1iZW5lZml0LW1lc3NhZ2UnICkucmVtb3ZlQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlIG0tYmVuZWZpdC1tZXNzYWdlLWVycm9yIG0tYmVuZWZpdC1tZXNzYWdlLWluZm8nICk7XG5cdFx0XHR9XG5cdFx0XHQvLyBzZXQgYnV0dG9uIHRvIHByb2Nlc3Npbmdcblx0XHRcdCRidXR0b24udGV4dCggJ1Byb2Nlc3NpbmcnICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gZGlzYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXG5cdFx0XHQvLyBzZXQgYWpheCBkYXRhXG5cdFx0XHR2YXIgZGF0YSA9IHt9O1xuXHRcdFx0dmFyIGJlbmVmaXRUeXBlID0gJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nICkudmFsKCk7XG5cdFx0XHRpZiAoICdwYXJ0bmVyLW9mZmVycycgPT09IGJlbmVmaXRUeXBlICkge1xuXHRcdFx0ICAgIGRhdGEgPSB7XG5cdFx0XHQgICAgICAgICdhY3Rpb24nIDogJ2JlbmVmaXRfZm9ybV9zdWJtaXQnLFxuXHRcdFx0ICAgICAgICAnbWlubnBvc3RfbWVtYmVyc2hpcF9iZW5lZml0X2Zvcm1fbm9uY2UnIDogJGJ1dHRvbi5kYXRhKCAnYmVuZWZpdC1ub25jZScgKSxcblx0XHRcdCAgICAgICAgJ2N1cnJlbnRfdXJsJyA6ICQoICdpbnB1dFtuYW1lPVwiY3VycmVudF91cmxcIl0nKS52YWwoKSxcblx0XHRcdCAgICAgICAgJ2JlbmVmaXQtbmFtZSc6ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJykudmFsKCksXG5cdFx0XHQgICAgICAgICdpbnN0YW5jZV9pZCcgOiAkKCAnW25hbWU9XCJpbnN0YW5jZS1pZC0nICsgJGJ1dHRvbi52YWwoKSArICdcIl0nICkudmFsKCksXG5cdFx0XHQgICAgICAgICdwb3N0X2lkJyA6ICRidXR0b24udmFsKCksXG5cdFx0XHQgICAgICAgICdpc19hamF4JyA6ICcxJyxcblx0XHRcdCAgICB9O1xuXG5cdFx0XHQgICAgJC5wb3N0KCBzZXR0aW5ncy5hamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHQgICAgXHQvLyBzdWNjZXNzXG5cdFx0XHRcdCAgICBpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdCAgICBcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHQgICAgXHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHQgICAgXHQkc3RhdHVzLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmFkZENsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzICk7XG5cdFx0XHRcdCAgICBcdGlmICggMCA8ICRzZWxlY3QubGVuZ3RoICkge1xuXHRcdFx0XHQgICAgXHRcdCRzZWxlY3QucHJvcCggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHQgICAgXHR9XG5cdFx0XHRcdCAgICBcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkuYXR0ciggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHQgICAgfSBlbHNlIHtcblx0XHRcdFx0ICAgIFx0Ly8gZXJyb3Jcblx0XHRcdFx0ICAgIFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdCAgICBcdGlmICggJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiByZXNwb25zZS5kYXRhLnJlbW92ZV9pbnN0YW5jZV92YWx1ZSApIHtcblx0XHRcdFx0XHQgICAgXHRpZiAoICcnICE9PSByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApIHtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHQgICAgXHR9IGVsc2Uge1xuXHRcdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0ICAgIFx0fVxuXHRcdFx0XHRcdCAgICB9IGVsc2Uge1xuXHRcdFx0XHQgICAgXHRcdCQoICdvcHRpb24nLCAkc2VsZWN0ICkuZWFjaCggZnVuY3Rpb24oIGkgKSB7XG5cdFx0XHRcdCAgICBcdFx0XHRpZiAoICQoIHRoaXMgKS52YWwoKSA9PT0gcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdCAgICBcdFx0XHRcdCQoIHRoaXMgKS5yZW1vdmUoKTtcblx0XHRcdFx0ICAgIFx0XHRcdH1cblx0XHRcdFx0ICAgIFx0XHR9KTtcblx0XHRcdFx0ICAgIFx0XHRpZiAoICcnICE9PSByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApIHtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHQgICAgXHR9IGVsc2Uge1xuXHRcdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0ICAgIFx0fVxuXHRcdFx0XHQgICAgXHR9XG5cdFx0XHRcdCAgICBcdC8vIHJlLWVuYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdFx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXHRcdFx0XHQgICAgXHQkc3RhdHVzLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmFkZENsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzICk7XG5cdFx0XHRcdCAgICB9XG5cblx0XHRcdFx0fSk7XG5cdFx0ICAgIH1cblx0XHR9KTtcblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXHRcdGlmICggMCA8ICQoICcubS1mb3JtLW1lbWJlcnNoaXAtYmVuZWZpdCcgKS5sZW5ndGggKSB7XG5cdFx0XHRiZW5lZml0Rm9ybSgpO1xuXHRcdH1cblx0fSk7XG5cblx0JCggJy5hLXJlZnJlc2gtcGFnZScgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0bG9jYXRpb24ucmVsb2FkKCk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiKCBmdW5jdGlvbiggJCApIHtcblx0ZnVuY3Rpb24gbXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQoIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApIHtcblx0XHRpZiAoIHR5cGVvZiBnYSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkgeyBcblx0XHQkKCAnLm0tc3VwcG9ydC1jdGEtdG9wIC5hLXN1cHBvcnQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgdmFsdWUgPSAnJztcblx0XHRcdGlmICggJCggJ3N2ZycsICQoIHRoaXMgKSApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdHZhbHVlID0gJCggJ3N2ZycsICQoIHRoaXMgKSApLmF0dHIoICd0aXRsZScgKSArICcgJztcblx0XHRcdH1cblx0XHRcdHZhbHVlID0gdmFsdWUgKyAkKCB0aGlzICkudGV4dCgpO1xuXHRcdFx0bXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQoICdldmVudCcsICdTdXBwb3J0IENUQSAtIEhlYWRlcicsICdDbGljazogJyArIHZhbHVlLCBsb2NhdGlvbi5wYXRobmFtZSApO1xuXHRcdH0pO1xuXHR9KTtcblxufSApKCBqUXVlcnkgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIHVuZGVmaW5lZCApIHtcblxuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RNZW1iZXJzaGlwJyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0J2RlYnVnJyA6IGZhbHNlLCAvLyB0aGlzIGNhbiBiZSBzZXQgdG8gdHJ1ZSBvbiBwYWdlIGxldmVsIG9wdGlvbnNcblx0XHQnYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUnIDogJyNhbW91bnQtaXRlbSAjYW1vdW50Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUnIDogJy5tLW1lbWJlcnNoaXAtZmFzdC1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHQnbGV2ZWxfdmlld2VyX2NvbnRhaW5lcicgOiAnLmEtc2hvdy1sZXZlbCcsXG5cdFx0J2xldmVsX25hbWUnIDogJy5hLWxldmVsJyxcblx0XHQndXNlcl9jdXJyZW50X2xldmVsJyA6ICcuYS1jdXJyZW50LWxldmVsJyxcblx0XHQndXNlcl9uZXdfbGV2ZWwnIDogJy5hLW5ldy1sZXZlbCcsXG5cdFx0J2Ftb3VudF92aWV3ZXInIDogJy5hbW91bnQgaDMnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYS1mb3JtLWl0ZW0tbWVtYmVyc2hpcC1mcmVxdWVuY3knLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzX3R5cGUnIDogJ3NlbGVjdCcsXG5cdFx0J2xldmVsc19jb250YWluZXInIDogJy5vLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVscycsXG5cdFx0J3NpbmdsZV9sZXZlbF9jb250YWluZXInIDogJy5tLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVsJyxcblx0XHQnc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3InIDogJy5tLW1lbWJlci1sZXZlbC1icmllZicsXG5cdFx0J2ZsaXBwZWRfaXRlbXMnIDogJ2Rpdi5hbW91bnQsIGRpdi5lbnRlcicsXG5cdFx0J2xldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yJyA6ICcuc2hvdy1mcmVxdWVuY3knLFxuXHRcdCdjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmFtb3VudCAuYS1idXR0b24tZmxpcCcsXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5lbnRlciBpbnB1dC5hbW91bnQtZW50cnknLFxuXHR9OyAvLyBlbmQgZGVmYXVsdHNcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cblx0XHRpbml0OiBmdW5jdGlvbiggcmVzZXQsIGFtb3VudCApIHtcblx0XHRcdC8vIFBsYWNlIGluaXRpYWxpemF0aW9uIGxvZ2ljIGhlcmVcblx0XHRcdC8vIFlvdSBhbHJlYWR5IGhhdmUgYWNjZXNzIHRvIHRoZSBET00gZWxlbWVudCBhbmRcblx0XHRcdC8vIHRoZSBvcHRpb25zIHZpYSB0aGUgaW5zdGFuY2UsIGUuZy4gdGhpcy5lbGVtZW50XG5cdFx0XHQvLyBhbmQgdGhpcy5vcHRpb25zXG5cdFx0XHQvLyB5b3UgY2FuIGFkZCBtb3JlIGZ1bmN0aW9ucyBsaWtlIHRoZSBvbmUgYmVsb3cgYW5kXG5cdFx0XHQvLyBjYWxsIHRoZW0gbGlrZSBzbzogdGhpcy55b3VyT3RoZXJGdW5jdGlvbih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucykuXG5cdFx0XHR0aGlzLmNhdGNoSGFzaExpbmtzKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLmxldmVsRmxpcHBlciggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuc3RhcnRMZXZlbENsaWNrKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdH0sXG5cblx0XHRjYXRjaEhhc2hMaW5rczogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCdhW2hyZWYqPVwiI1wiXTpub3QoW2hyZWY9XCIjXCJdKScsIGVsZW1lbnQpLmNsaWNrKGZ1bmN0aW9uKGUpIHtcblx0XHRcdCAgICB2YXIgdGFyZ2V0ID0gJChlLnRhcmdldCk7XG5cdFx0XHQgICAgaWYgKHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiYgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpID09IHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpICYmIGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWUpIHtcblx0XHRcdFx0ICAgIHZhciB0YXJnZXQgPSAkKHRoaXMuaGFzaCk7XG5cdFx0XHRcdCAgICB0YXJnZXQgPSB0YXJnZXQubGVuZ3RoID8gdGFyZ2V0IDogJCgnW25hbWU9JyArIHRoaXMuaGFzaC5zbGljZSgxKSArJ10nKTtcblx0XHRcdFx0XHRpZiAodGFyZ2V0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0JCgnaHRtbCxib2R5JykuYW5pbWF0ZSh7XG5cdFx0XHRcdFx0XHRcdHNjcm9sbFRvcDogdGFyZ2V0Lm9mZnNldCgpLnRvcFxuXHRcdFx0XHRcdFx0fSwgMTAwMCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgY2F0Y2hMaW5rc1xuXG5cdFx0bGV2ZWxGbGlwcGVyOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBwcmV2aW91c19hbW91bnQgPSAnJztcblx0XHRcdHZhciBhbW91bnQgPSAwO1xuXHRcdFx0dmFyIGxldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gMDtcblx0XHRcdHZhciBmcmVxdWVuY3lfc3RyaW5nID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5ID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSAnJztcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgJiYgJCggb3B0aW9ucy51c2VyX2N1cnJlbnRfbGV2ZWwgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRwcmV2aW91c19hbW91bnQgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudDtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLmxlbmd0aCA+IDAgJiZcblx0XHRcdCAgICAgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKTtcblx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpO1xuXHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0ICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXG5cdFx0XHQgICAgJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lKS5jaGFuZ2UoIGZ1bmN0aW9uKCkge1xuXG5cdFx0XHQgICAgXHRmcmVxdWVuY3lfc3RyaW5nID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpXG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0ICAgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKSwgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS5hdHRyKCAnZGF0YS15ZWFyLWZyZXF1ZW5jeScgKSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cdFx0XHQgICAgfSk7XG5cblx0XHRcdCAgICAkKG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUpLmJpbmQoJ2tleXVwIG1vdXNldXAnLCBmdW5jdGlvbigpIHtcblx0XHRcdCAgICBcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKClcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0ICAgICAgaWYoJCh0aGlzKS5kYXRhKCdsYXN0LXZhbHVlJykgIT0gJCh0aGlzKS52YWwoKSkge1xuXHRcdFx0ICAgICAgICAkKHRoaXMpLmRhdGEoJ2xhc3QtdmFsdWUnLCAkKHRoaXMpLnZhbCgpKTtcblx0XHRcdCAgICAgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKSwgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS5hdHRyKCAnZGF0YS15ZWFyLWZyZXF1ZW5jeScgKSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgICAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdCAgICAgIH07XG5cdFx0XHQgICAgfSk7XG5cblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbHNfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCApLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5mbGlwcGVkX2l0ZW1zLCAkKHRoaXMpICkud3JhcEFsbCggJzxkaXYgY2xhc3M9XCJmbGlwcGVyXCIvPicgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKHRoaXMpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHQgICAgaWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblxuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cblx0XHRcdFx0XHRcdGlmICggZnJlcXVlbmN5ID09IDEgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LXllYXJseScgKSApO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5ID09IDEyICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC1tb250aGx5JyApICk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblxuXHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHR0aGF0LmNoYW5nZUZyZXF1ZW5jeSggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJCggb3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IsIGVsZW1lbnQpLnRleHQoZnJlcXVlbmN5X25hbWUpO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkudmFsKCk7XG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRoYXQuY2hhbmdlQW1vdW50UHJldmlldyggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpLnBhcmVudCgpICkudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBsZXZlbEZsaXBwZXJcblxuXHRcdGNoZWNrTGV2ZWw6IGZ1bmN0aW9uKCBhbW91bnQsIGZyZXF1ZW5jeSwgdHlwZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdCAgdmFyIHRoaXN5ZWFyID0gcGFyc2VJbnQoIGFtb3VudCApICogcGFyc2VJbnQoIGZyZXF1ZW5jeSApO1xuXHRcdCAgdmFyIGxldmVsID0gJyc7XG5cdFx0ICBpZiAoIHR5cGVvZiBwcmV2aW91c19hbW91bnQgIT09ICd1bmRlZmluZWQnICYmIHByZXZpb3VzX2Ftb3VudCAhPT0gJycgKSB7XG5cdFx0ICAgIHZhciBwcmlvcl95ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQucHJpb3JfeWVhcl9jb250cmlidXRpb25zICk7XG5cdFx0ICAgIHZhciBjb21pbmdfeWVhcl9hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LmNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMgKTtcblx0XHQgICAgdmFyIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5hbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdCAgICAvLyBjYWxjdWxhdGUgbWVtYmVyIGxldmVsIGZvcm11bGFcblx0XHQgICAgaWYgKCB0eXBlID09PSAnb25lLXRpbWUnICkge1xuXHRcdCAgICAgIHByaW9yX3llYXJfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdCAgICB9IGVsc2Uge1xuXHRcdCAgICAgIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdCAgICB9XG5cblx0XHQgICAgdGhpc3llYXIgPSBNYXRoLm1heCggcHJpb3JfeWVhcl9hbW91bnQsIGNvbWluZ195ZWFyX2Ftb3VudCwgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHQgIH1cblxuXHRcdCAgbGV2ZWwgPSB0aGlzLmdldExldmVsKCB0aGlzeWVhciApO1xuXG5cdFx0ICAkKCdoMicsIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdCAgICBpZiAoICQodGhpcykudGV4dCgpID09IGxldmVsWyduYW1lJ10gKSB7XG5cdFx0ICAgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHQgICAgICAkKHRoaXMpLnBhcmVudCgpLnBhcmVudCgpLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdCAgICB9XG5cdFx0ICB9ICk7XG5cdFx0ICByZXR1cm4gbGV2ZWw7XG5cblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Z2V0TGV2ZWw6IGZ1bmN0aW9uKCB0aGlzeWVhciApIHtcblx0XHRcdHZhciBsZXZlbCA9IFtdO1xuXHRcdFx0aWYgKCB0aGlzeWVhciA+IDAgJiYgdGhpc3llYXIgPCA2MCApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdCcm9uemUnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAxO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodGhpc3llYXIgPiA1OSAmJiB0aGlzeWVhciA8IDEyMCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1NpbHZlcic7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDI7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMTE5ICYmIHRoaXN5ZWFyIDwgMjQwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnR29sZCc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDM7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMjM5KSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnUGxhdGludW0nO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSA0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBnZXRMZXZlbFxuXG5cdFx0c2hvd05ld0xldmVsOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKSB7XG5cdFx0XHR2YXIgbWVtYmVyX2xldmVsX3ByZWZpeCA9ICcnO1xuXHRcdFx0dmFyIG9sZF9sZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgPSBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXI7IC8vIHRoaXMgc2hvdWxkIGNoYW5nZSB3aGVuIHdlIHJlcGxhY2UgdGhlIHRleHQsIGlmIHRoZXJlIGlzIGEgbGluayBpbnNpZGUgaXRcblx0XHRcdHZhciBkZWNvZGVIdG1sRW50aXR5ID0gZnVuY3Rpb24oIHN0ciApIHtcblx0XHRcdFx0cmV0dXJuIHN0ci5yZXBsYWNlKCAvJiMoXFxkKyk7L2csIGZ1bmN0aW9uKCBtYXRjaCwgZGVjICkge1xuXHRcdFx0XHRcdHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKCBkZWMgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0bWVtYmVyX2xldmVsX3ByZWZpeCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5tZW1iZXJfbGV2ZWxfcHJlZml4O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0JChvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIpLnByb3AoICdjbGFzcycsICdhLXNob3ctbGV2ZWwgYS1zaG93LWxldmVsLScgKyBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKTtcblxuXHRcdFx0XHRpZiAoICQoIG9wdGlvbnMudXNlcl9jdXJyZW50X2xldmVsICkubGVuZ3RoID4gMCAmJiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdFx0aWYgKCAnYScsICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHRsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yID0gb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICsgJyBhJztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvbGRfbGV2ZWwgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5yZXBsYWNlKCBtZW1iZXJfbGV2ZWxfcHJlZml4LCAnJyApO1xuXG5cdFx0XHRcdFx0aWYgKCBvbGRfbGV2ZWwgIT09IGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApIHtcblx0XHRcdFx0XHRcdCQoIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5kYXRhKCAnY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5kYXRhKCAnbm90LWNoYW5nZWQnICkgKSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9uYW1lLCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIpLnRleHQoIGxldmVsWyduYW1lJ10gKTtcblx0XHRcdH1cblxuXHRcdH0sIC8vIGVuZCBzaG93TmV3TGV2ZWxcblxuXHRcdGNoYW5nZUZyZXF1ZW5jeTogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0ICAgIHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdCAgICB2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5ICAgICAgPSBwYXJzZUludCggc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzFdICk7XG5cblx0XHRcdCAgICAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS52YWwoIHNlbGVjdGVkICk7XG4gICAgXHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkucHJvcCggJ3NlbGVjdGVkJywgc2VsZWN0ZWQgKTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuICAgIFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLmRhdGEoICdmcmVxdWVuY3knLCBmcmVxdWVuY3kgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VGcmVxdWVuY3lcblxuXHRcdGNoYW5nZUFtb3VudFByZXZpZXc6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdCAgICB2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHQgICAgdmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VBbW91bnRQcmV2aWV3XG5cblx0XHRzdGFydExldmVsQ2xpY2s6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnLnN0YXJ0LWxldmVsJykuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBsZXZlbF9jbGFzcyA9ICQoIHRoaXMgKS5wcm9wKCAnY2xhc3MnICk7XG5cdFx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSBsZXZlbF9jbGFzc1tsZXZlbF9jbGFzcy5sZW5ndGggLTFdO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIsIGVsZW1lbnQgKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKyAnICcgKyBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0ICB9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCApO1xuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCApIHtcblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0VHJhY2tTdWJtaXQnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHR0eXBlOiAnZXZlbnQnLFxuXHRcdGNhdGVnb3J5OiAnU3VwcG9ydCBVcycsXG5cdFx0YWN0aW9uOiAnQmVjb21lIEEgTWVtYmVyJyxcblx0XHRsYWJlbDogbG9jYXRpb24ucGF0aG5hbWVcblx0fTtcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXHRcdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zO1xuXG5cdFx0XHQkKCB0aGlzLmVsZW1lbnQgKS5zdWJtaXQoIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0dGhhdC5hbmFseXRpY3NFdmVudFRyYWNrKFxuXHRcdFx0XHRcdG9wdGlvbnMudHlwZSxcblx0XHRcdFx0XHRvcHRpb25zLmNhdGVnb3J5LFxuXHRcdFx0XHRcdG9wdGlvbnMuYWN0aW9uLFxuXHRcdFx0XHRcdG9wdGlvbnMubGFiZWxcblx0XHRcdFx0KTtcblx0XHRcdFx0Ly8gYWxzbyBidWJibGVzIHRoZSBldmVudCB1cCB0byBzdWJtaXQgdGhlIGZvcm1cblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRhbmFseXRpY3NFdmVudFRyYWNrOiBmdW5jdGlvbiggdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgZ2EgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmICggdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwgKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKTtcblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzRXZlbnRUcmFja1xuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50ICk7XG4iXX0=
