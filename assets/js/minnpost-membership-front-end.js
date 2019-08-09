"use strict";

// plugin
;

(function ($, window, document) {
  // Create the defaults once
  var pluginName = 'minnpostAmountSelect',
      defaults = {
    frequencySelector: '.m-frequency-select input[type="radio"]',
    amountGroup: '.m-frequency-group',
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
      var $groups = $(this.options.amountGroup);
      var $selected = $(this.options.amountSelector).filter(':checked');
      var index = $selected.data('index');
      $groups.removeClass('active');
      $groups.filter('[data-frequency="' + frequencyString + '"]').addClass('active');
      $selected.prop('checked', false);
      $groups.filter('.active').find('input[type="radio"][data-index="' + index + '"]').prop('checked', true);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFtb3VudC1zZWxlY3QuanMiLCJiZW5lZml0cy5qcyIsImN0YS5qcyIsIm1lbWJlci1sZXZlbHMuanMiLCJ0cmFjay1zdWJtaXQuanMiXSwibmFtZXMiOlsiJCIsIndpbmRvdyIsImRvY3VtZW50IiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiZnJlcXVlbmN5U2VsZWN0b3IiLCJhbW91bnRHcm91cCIsImFtb3VudFNlbGVjdG9yIiwiYW1vdW50TGFiZWxzIiwiYW1vdW50VmFsdWUiLCJhbW91bnREZXNjcmlwdGlvbiIsImFtb3VudEZpZWxkIiwiUGx1Z2luIiwiZWxlbWVudCIsIm9wdGlvbnMiLCJleHRlbmQiLCJfZGVmYXVsdHMiLCJfbmFtZSIsImluaXQiLCJwcm90b3R5cGUiLCJmcmVxdWVuY2llcyIsImZpbmQiLCJhbW91bnRzIiwiYW1vdW50Iiwic2V0QW1vdW50TGFiZWxzIiwiZmlsdGVyIiwidmFsIiwiY2hhbmdlIiwib25GcmVxdWVuY3lDaGFuZ2UiLCJiaW5kIiwib24iLCJjbGVhckFtb3VudEZpZWxkIiwiY2xlYXJBbW91bnRTZWxlY3RvciIsImV2ZW50IiwidGFyZ2V0IiwiZnJlcXVlbmN5U3RyaW5nIiwiJGdyb3VwcyIsIiRzZWxlY3RlZCIsImluZGV4IiwiZGF0YSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJwcm9wIiwicmVtb3ZlQXR0ciIsImZuIiwiZWFjaCIsImpRdWVyeSIsImJlbmVmaXRGb3JtIiwicGVyZm9ybWFuY2UiLCJuYXZpZ2F0aW9uIiwidHlwZSIsImxvY2F0aW9uIiwicmVsb2FkIiwiY2xpY2siLCJwcmV2ZW50RGVmYXVsdCIsIiRidXR0b24iLCIkc3RhdHVzIiwicGFyZW50IiwiJHNlbGVjdCIsInNldHRpbmdzIiwibWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncyIsInRleHQiLCJiZW5lZml0VHlwZSIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwiYnV0dG9uX3ZhbHVlIiwiYnV0dG9uX2xhYmVsIiwiYnV0dG9uX2NsYXNzIiwiYnV0dG9uX2F0dHIiLCJodG1sIiwibWVzc2FnZSIsIm1lc3NhZ2VfY2xhc3MiLCJsZW5ndGgiLCJub3QiLCJhdHRyIiwicmVtb3ZlX2luc3RhbmNlX3ZhbHVlIiwic2hvdyIsImhpZGUiLCJpIiwicmVtb3ZlIiwicmVhZHkiLCJtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCIsImNhdGVnb3J5IiwiYWN0aW9uIiwibGFiZWwiLCJ2YWx1ZSIsImdhIiwicGF0aG5hbWUiLCJ1bmRlZmluZWQiLCJyZXNldCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwiZSIsInJlcGxhY2UiLCJob3N0bmFtZSIsImhhc2giLCJzbGljZSIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwicHJldmlvdXNfYW1vdW50IiwibGV2ZWwiLCJsZXZlbF9udW1iZXIiLCJmcmVxdWVuY3lfc3RyaW5nIiwiZnJlcXVlbmN5IiwiZnJlcXVlbmN5X25hbWUiLCJtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEiLCJ1c2VyX2N1cnJlbnRfbGV2ZWwiLCJjdXJyZW50X3VzZXIiLCJhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lIiwic3BsaXQiLCJjaGVja0xldmVsIiwic2hvd05ld0xldmVsIiwibGV2ZWxzX2NvbnRhaW5lciIsInNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yIiwiZmxpcHBlZF9pdGVtcyIsIndyYXBBbGwiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsImNsb3Nlc3QiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwiY2hhbmdlQW1vdW50UHJldmlldyIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwidGhpc3llYXIiLCJwYXJzZUludCIsInByaW9yX3llYXJfYW1vdW50IiwicHJpb3JfeWVhcl9jb250cmlidXRpb25zIiwiY29taW5nX3llYXJfYW1vdW50IiwiY29taW5nX3llYXJfY29udHJpYnV0aW9ucyIsImFubnVhbF9yZWN1cnJpbmdfYW1vdW50IiwiTWF0aCIsIm1heCIsImdldExldmVsIiwibWVtYmVyX2xldmVsX3ByZWZpeCIsIm9sZF9sZXZlbCIsImxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyIiwiZGVjb2RlSHRtbEVudGl0eSIsInN0ciIsIm1hdGNoIiwiZGVjIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwidG9Mb3dlckNhc2UiLCJtZW1iZXJfbGV2ZWwiLCJsZXZlbF9uYW1lIiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyIsInN1Ym1pdCIsImFuYWx5dGljc0V2ZW50VHJhY2siXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTs7QUFBQyxDQUFDLFVBQVdBLENBQVgsRUFBY0MsTUFBZCxFQUFzQkMsUUFBdEIsRUFBaUM7QUFDbEM7QUFDQSxNQUFJQyxVQUFVLEdBQUcsc0JBQWpCO0FBQUEsTUFDQUMsUUFBUSxHQUFHO0FBQ1ZDLElBQUFBLGlCQUFpQixFQUFFLHlDQURUO0FBRVZDLElBQUFBLFdBQVcsRUFBRSxvQkFGSDtBQUdWQyxJQUFBQSxjQUFjLEVBQUUsc0NBSE47QUFJVkMsSUFBQUEsWUFBWSxFQUFFLHdCQUpKO0FBS1ZDLElBQUFBLFdBQVcsRUFBRSxRQUxIO0FBTVZDLElBQUFBLGlCQUFpQixFQUFFLHVCQU5UO0FBT1ZDLElBQUFBLFdBQVcsRUFBRTtBQVBILEdBRFgsQ0FGa0MsQ0FhbEM7O0FBQ0EsV0FBU0MsTUFBVCxDQUFpQkMsT0FBakIsRUFBMEJDLE9BQTFC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UUFBaEIsRUFBMEJDLE1BQTFCLEVBQWtDQyxLQUFsQyxFQUF5Q0MsS0FBekMsQ0FBRjtBQUNBLEtBM0JpQixDQTJCZjs7QUEzQmUsR0FBbkIsQ0ExQmtDLENBc0QvQjtBQUdIO0FBQ0E7O0FBQ0F2RixFQUFBQSxDQUFDLENBQUM0QyxFQUFGLENBQUt6QyxVQUFMLElBQW1CLFVBQVdXLE9BQVgsRUFBcUI7QUFDdkMsV0FBTyxLQUFLK0IsSUFBTCxDQUFVLFlBQVk7QUFDNUIsVUFBSyxDQUFFN0MsQ0FBQyxDQUFDdUMsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZcEMsVUFBMUIsQ0FBUCxFQUFnRDtBQUMvQ0gsUUFBQUEsQ0FBQyxDQUFDdUMsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZcEMsVUFBMUIsRUFBc0MsSUFBSVMsTUFBSixDQUFZLElBQVosRUFBa0JFLE9BQWxCLENBQXRDO0FBQ0E7QUFDRCxLQUpNLENBQVA7QUFLQSxHQU5EO0FBT0EsQ0FsRUEsRUFrRUdnQyxNQWxFSCxFQWtFVzdDLE1BbEVYLEVBa0VtQkMsUUFsRW5CIiwiZmlsZSI6Im1pbm5wb3N0LW1lbWJlcnNoaXAtZnJvbnQtZW5kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCApIHtcblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0QW1vdW50U2VsZWN0Jyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0ZnJlcXVlbmN5U2VsZWN0b3I6ICcubS1mcmVxdWVuY3ktc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0YW1vdW50R3JvdXA6ICcubS1mcmVxdWVuY3ktZ3JvdXAnLFxuXHRcdGFtb3VudFNlbGVjdG9yOiAnLm0tYW1vdW50LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGFtb3VudExhYmVsczogJy5tLWFtb3VudC1zZWxlY3QgbGFiZWwnLFxuXHRcdGFtb3VudFZhbHVlOiAnc3Ryb25nJyxcblx0XHRhbW91bnREZXNjcmlwdGlvbjogJy5hLWFtb3VudC1kZXNjcmlwdGlvbicsXG5cdFx0YW1vdW50RmllbGQ6ICcuYS1hbW91bnQtZmllbGQgI2Ftb3VudCdcblx0fTtcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXHRcdGluaXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGZyZXF1ZW5jaWVzID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICk7XG5cdFx0XHR2YXIgYW1vdW50cyA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApO1xuXHRcdFx0dmFyIGFtb3VudCA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCApO1xuXG5cdFx0XHR0aGlzLnNldEFtb3VudExhYmVscyggZnJlcXVlbmNpZXMuZmlsdGVyKCc6Y2hlY2tlZCcpLnZhbCgpICk7XG5cdFx0XHRmcmVxdWVuY2llcy5jaGFuZ2UoIHRoaXMub25GcmVxdWVuY3lDaGFuZ2UuYmluZCh0aGlzKSApO1xuXHRcdFx0YW1vdW50cy5vbiggJ2NoYW5nZScsIHRoaXMuY2xlYXJBbW91bnRGaWVsZC5iaW5kKHRoaXMpICk7XG5cdFx0XHRhbW91bnQub24oICdrZXl1cCBtb3VzZXVwJywgdGhpcy5jbGVhckFtb3VudFNlbGVjdG9yLmJpbmQodGhpcykgKTtcblx0XHR9LFxuXG5cdFx0b25GcmVxdWVuY3lDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMuc2V0QW1vdW50TGFiZWxzKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSApO1xuXHRcdH0sXG5cblx0XHRzZXRBbW91bnRMYWJlbHM6IGZ1bmN0aW9uKCBmcmVxdWVuY3lTdHJpbmcgKSB7XG5cdFx0XHR2YXIgJGdyb3VwcyA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRHcm91cCApO1xuXHRcdFx0dmFyICRzZWxlY3RlZCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApXG5cdFx0XHQgICAgLmZpbHRlciggJzpjaGVja2VkJyApO1xuXHRcdFx0dmFyIGluZGV4ID0gJHNlbGVjdGVkLmRhdGEoICdpbmRleCcgKTtcblxuXHRcdFx0JGdyb3Vwcy5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCRncm91cHMuZmlsdGVyKCAnW2RhdGEtZnJlcXVlbmN5PVwiJyArIGZyZXF1ZW5jeVN0cmluZyArICdcIl0nIClcblx0XHRcdFx0LmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0JHNlbGVjdGVkLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHRcdCRncm91cHMuZmlsdGVyKCAnLmFjdGl2ZScgKVxuXHRcdFx0XHQuZmluZCggJ2lucHV0W3R5cGU9XCJyYWRpb1wiXVtkYXRhLWluZGV4PVwiJyArIGluZGV4ICsgJ1wiXScgKVxuXHRcdFx0XHQucHJvcCggJ2NoZWNrZWQnLCB0cnVlICk7XG5cdFx0fSwgLy8gZW5kIHNldEFtb3VudExhYmVsc1xuXG5cdFx0Y2xlYXJBbW91bnRTZWxlY3RvcjogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIGFtb3VudHMgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKTtcblxuXHRcdFx0aWYgKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSA9PT0gJycgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0YW1vdW50cy5yZW1vdmVBdHRyKCdjaGVja2VkJyk7XG5cdFx0fSxcblxuXHRcdGNsZWFyQW1vdW50RmllbGQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdCQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCApLnZhbCggbnVsbCApO1xuXHRcdH0sXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQgKTtcbiIsIiggZnVuY3Rpb24oICQgKSB7XG5cblx0ZnVuY3Rpb24gYmVuZWZpdEZvcm0oKSB7XG5cdFx0aWYgKCAyID09PSBwZXJmb3JtYW5jZS5uYXZpZ2F0aW9uLnR5cGUgKSB7XG5cdFx0ICAgbG9jYXRpb24ucmVsb2FkKCB0cnVlICk7XG5cdFx0fVxuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbi5hLWJ1dHRvbi1kaXNhYmxlZCcgKS5yZW1vdmVBdHRyKCAnZGlzYWJsZWQnICk7XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0dmFyICRidXR0b24gID0gJCggdGhpcyApO1xuXHRcdFx0dmFyICRzdGF0dXMgID0gJCggJy5tLWJlbmVmaXQtbWVzc2FnZScsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyICRzZWxlY3QgID0gJCggJ3NlbGVjdCcsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyIHNldHRpbmdzID0gbWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncztcblx0XHRcdC8vIHJlc2V0IHRoZSBtZXNzYWdlIGZvciBjdXJyZW50IHN0YXR1c1xuXHRcdFx0aWYgKCAhICcubS1iZW5lZml0LW1lc3NhZ2Utc3VjY2VzcycgKSB7XG5cdFx0XHRcdCQoICcubS1iZW5lZml0LW1lc3NhZ2UnICkucmVtb3ZlQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlIG0tYmVuZWZpdC1tZXNzYWdlLWVycm9yIG0tYmVuZWZpdC1tZXNzYWdlLWluZm8nICk7XG5cdFx0XHR9XG5cdFx0XHQvLyBzZXQgYnV0dG9uIHRvIHByb2Nlc3Npbmdcblx0XHRcdCRidXR0b24udGV4dCggJ1Byb2Nlc3NpbmcnICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gZGlzYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXG5cdFx0XHQvLyBzZXQgYWpheCBkYXRhXG5cdFx0XHR2YXIgZGF0YSA9IHt9O1xuXHRcdFx0dmFyIGJlbmVmaXRUeXBlID0gJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nICkudmFsKCk7XG5cdFx0XHRpZiAoICdwYXJ0bmVyLW9mZmVycycgPT09IGJlbmVmaXRUeXBlICkge1xuXHRcdFx0ICAgIGRhdGEgPSB7XG5cdFx0XHQgICAgICAgICdhY3Rpb24nIDogJ2JlbmVmaXRfZm9ybV9zdWJtaXQnLFxuXHRcdFx0ICAgICAgICAnbWlubnBvc3RfbWVtYmVyc2hpcF9iZW5lZml0X2Zvcm1fbm9uY2UnIDogJGJ1dHRvbi5kYXRhKCAnYmVuZWZpdC1ub25jZScgKSxcblx0XHRcdCAgICAgICAgJ2N1cnJlbnRfdXJsJyA6ICQoICdpbnB1dFtuYW1lPVwiY3VycmVudF91cmxcIl0nKS52YWwoKSxcblx0XHRcdCAgICAgICAgJ2JlbmVmaXQtbmFtZSc6ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJykudmFsKCksXG5cdFx0XHQgICAgICAgICdpbnN0YW5jZV9pZCcgOiAkKCAnW25hbWU9XCJpbnN0YW5jZS1pZC0nICsgJGJ1dHRvbi52YWwoKSArICdcIl0nICkudmFsKCksXG5cdFx0XHQgICAgICAgICdwb3N0X2lkJyA6ICRidXR0b24udmFsKCksXG5cdFx0XHQgICAgICAgICdpc19hamF4JyA6ICcxJyxcblx0XHRcdCAgICB9O1xuXG5cdFx0XHQgICAgJC5wb3N0KCBzZXR0aW5ncy5hamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHQgICAgXHQvLyBzdWNjZXNzXG5cdFx0XHRcdCAgICBpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdCAgICBcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHQgICAgXHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHQgICAgXHQkc3RhdHVzLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmFkZENsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzICk7XG5cdFx0XHRcdCAgICBcdGlmICggMCA8ICRzZWxlY3QubGVuZ3RoICkge1xuXHRcdFx0XHQgICAgXHRcdCRzZWxlY3QucHJvcCggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHQgICAgXHR9XG5cdFx0XHRcdCAgICBcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkuYXR0ciggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHQgICAgfSBlbHNlIHtcblx0XHRcdFx0ICAgIFx0Ly8gZXJyb3Jcblx0XHRcdFx0ICAgIFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdCAgICBcdGlmICggJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiByZXNwb25zZS5kYXRhLnJlbW92ZV9pbnN0YW5jZV92YWx1ZSApIHtcblx0XHRcdFx0XHQgICAgXHRpZiAoICcnICE9PSByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApIHtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHQgICAgXHR9IGVsc2Uge1xuXHRcdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0ICAgIFx0fVxuXHRcdFx0XHRcdCAgICB9IGVsc2Uge1xuXHRcdFx0XHQgICAgXHRcdCQoICdvcHRpb24nLCAkc2VsZWN0ICkuZWFjaCggZnVuY3Rpb24oIGkgKSB7XG5cdFx0XHRcdCAgICBcdFx0XHRpZiAoICQoIHRoaXMgKS52YWwoKSA9PT0gcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdCAgICBcdFx0XHRcdCQoIHRoaXMgKS5yZW1vdmUoKTtcblx0XHRcdFx0ICAgIFx0XHRcdH1cblx0XHRcdFx0ICAgIFx0XHR9KTtcblx0XHRcdFx0ICAgIFx0XHRpZiAoICcnICE9PSByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApIHtcblx0XHRcdFx0XHQgICAgXHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHQgICAgXHR9IGVsc2Uge1xuXHRcdFx0XHRcdCAgICBcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0ICAgIFx0fVxuXHRcdFx0XHQgICAgXHR9XG5cdFx0XHRcdCAgICBcdC8vIHJlLWVuYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdFx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXHRcdFx0XHQgICAgXHQkc3RhdHVzLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmFkZENsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzICk7XG5cdFx0XHRcdCAgICB9XG5cblx0XHRcdFx0fSk7XG5cdFx0ICAgIH1cblx0XHR9KTtcblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXHRcdGlmICggMCA8ICQoICcubS1mb3JtLW1lbWJlcnNoaXAtYmVuZWZpdCcgKS5sZW5ndGggKSB7XG5cdFx0XHRiZW5lZml0Rm9ybSgpO1xuXHRcdH1cblx0fSk7XG5cblx0JCggJy5hLXJlZnJlc2gtcGFnZScgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0bG9jYXRpb24ucmVsb2FkKCk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiKCBmdW5jdGlvbiggJCApIHtcblx0ZnVuY3Rpb24gbXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQoIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApIHtcblx0XHRpZiAoIHR5cGVvZiBnYSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkgeyBcblx0XHQkKCAnLm0tc3VwcG9ydC1jdGEtdG9wIC5hLXN1cHBvcnQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgdmFsdWUgPSAnJztcblx0XHRcdGlmICggJCggJ3N2ZycsICQoIHRoaXMgKSApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdHZhbHVlID0gJCggJ3N2ZycsICQoIHRoaXMgKSApLmF0dHIoICd0aXRsZScgKSArICcgJztcblx0XHRcdH1cblx0XHRcdHZhbHVlID0gdmFsdWUgKyAkKCB0aGlzICkudGV4dCgpO1xuXHRcdFx0bXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQoICdldmVudCcsICdTdXBwb3J0IENUQSAtIEhlYWRlcicsICdDbGljazogJyArIHZhbHVlLCBsb2NhdGlvbi5wYXRobmFtZSApO1xuXHRcdH0pO1xuXHR9KTtcblxufSApKCBqUXVlcnkgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIHVuZGVmaW5lZCApIHtcblxuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RNZW1iZXJzaGlwJyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0J2RlYnVnJyA6IGZhbHNlLCAvLyB0aGlzIGNhbiBiZSBzZXQgdG8gdHJ1ZSBvbiBwYWdlIGxldmVsIG9wdGlvbnNcblx0XHQnYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUnIDogJyNhbW91bnQtaXRlbSAjYW1vdW50Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUnIDogJy5tLW1lbWJlcnNoaXAtZmFzdC1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHQnbGV2ZWxfdmlld2VyX2NvbnRhaW5lcicgOiAnLmEtc2hvdy1sZXZlbCcsXG5cdFx0J2xldmVsX25hbWUnIDogJy5hLWxldmVsJyxcblx0XHQndXNlcl9jdXJyZW50X2xldmVsJyA6ICcuYS1jdXJyZW50LWxldmVsJyxcblx0XHQndXNlcl9uZXdfbGV2ZWwnIDogJy5hLW5ldy1sZXZlbCcsXG5cdFx0J2Ftb3VudF92aWV3ZXInIDogJy5hbW91bnQgaDMnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYS1mb3JtLWl0ZW0tbWVtYmVyc2hpcC1mcmVxdWVuY3knLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzX3R5cGUnIDogJ3NlbGVjdCcsXG5cdFx0J2xldmVsc19jb250YWluZXInIDogJy5vLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVscycsXG5cdFx0J3NpbmdsZV9sZXZlbF9jb250YWluZXInIDogJy5tLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVsJyxcblx0XHQnc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3InIDogJy5tLW1lbWJlci1sZXZlbC1icmllZicsXG5cdFx0J2ZsaXBwZWRfaXRlbXMnIDogJ2Rpdi5hbW91bnQsIGRpdi5lbnRlcicsXG5cdFx0J2xldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yJyA6ICcuc2hvdy1mcmVxdWVuY3knLFxuXHRcdCdjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmFtb3VudCAuYS1idXR0b24tZmxpcCcsXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5lbnRlciBpbnB1dC5hbW91bnQtZW50cnknLFxuXHR9OyAvLyBlbmQgZGVmYXVsdHNcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cblx0XHRpbml0OiBmdW5jdGlvbiggcmVzZXQsIGFtb3VudCApIHtcblx0XHRcdC8vIFBsYWNlIGluaXRpYWxpemF0aW9uIGxvZ2ljIGhlcmVcblx0XHRcdC8vIFlvdSBhbHJlYWR5IGhhdmUgYWNjZXNzIHRvIHRoZSBET00gZWxlbWVudCBhbmRcblx0XHRcdC8vIHRoZSBvcHRpb25zIHZpYSB0aGUgaW5zdGFuY2UsIGUuZy4gdGhpcy5lbGVtZW50XG5cdFx0XHQvLyBhbmQgdGhpcy5vcHRpb25zXG5cdFx0XHQvLyB5b3UgY2FuIGFkZCBtb3JlIGZ1bmN0aW9ucyBsaWtlIHRoZSBvbmUgYmVsb3cgYW5kXG5cdFx0XHQvLyBjYWxsIHRoZW0gbGlrZSBzbzogdGhpcy55b3VyT3RoZXJGdW5jdGlvbih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucykuXG5cdFx0XHR0aGlzLmNhdGNoSGFzaExpbmtzKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLmxldmVsRmxpcHBlciggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuc3RhcnRMZXZlbENsaWNrKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdH0sXG5cblx0XHRjYXRjaEhhc2hMaW5rczogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCdhW2hyZWYqPVwiI1wiXTpub3QoW2hyZWY9XCIjXCJdKScsIGVsZW1lbnQpLmNsaWNrKGZ1bmN0aW9uKGUpIHtcblx0XHRcdCAgICB2YXIgdGFyZ2V0ID0gJChlLnRhcmdldCk7XG5cdFx0XHQgICAgaWYgKHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiYgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpID09IHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpICYmIGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWUpIHtcblx0XHRcdFx0ICAgIHZhciB0YXJnZXQgPSAkKHRoaXMuaGFzaCk7XG5cdFx0XHRcdCAgICB0YXJnZXQgPSB0YXJnZXQubGVuZ3RoID8gdGFyZ2V0IDogJCgnW25hbWU9JyArIHRoaXMuaGFzaC5zbGljZSgxKSArJ10nKTtcblx0XHRcdFx0XHRpZiAodGFyZ2V0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0JCgnaHRtbCxib2R5JykuYW5pbWF0ZSh7XG5cdFx0XHRcdFx0XHRcdHNjcm9sbFRvcDogdGFyZ2V0Lm9mZnNldCgpLnRvcFxuXHRcdFx0XHRcdFx0fSwgMTAwMCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgY2F0Y2hMaW5rc1xuXG5cdFx0bGV2ZWxGbGlwcGVyOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBwcmV2aW91c19hbW91bnQgPSAnJztcblx0XHRcdHZhciBhbW91bnQgPSAwO1xuXHRcdFx0dmFyIGxldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gMDtcblx0XHRcdHZhciBmcmVxdWVuY3lfc3RyaW5nID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5ID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSAnJztcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgJiYgJCggb3B0aW9ucy51c2VyX2N1cnJlbnRfbGV2ZWwgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRwcmV2aW91c19hbW91bnQgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudDtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLmxlbmd0aCA+IDAgJiZcblx0XHRcdCAgICAgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKTtcblx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpO1xuXHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0ICAgIGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgIHRoYXQuc2hvd05ld0xldmVsKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApO1xuXG5cdFx0XHQgICAgJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lKS5jaGFuZ2UoIGZ1bmN0aW9uKCkge1xuXG5cdFx0XHQgICAgXHRmcmVxdWVuY3lfc3RyaW5nID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcpLnZhbCgpXG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0ICAgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKSwgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS5hdHRyKCAnZGF0YS15ZWFyLWZyZXF1ZW5jeScgKSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgICAgdGhhdC5zaG93TmV3TGV2ZWwoIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICk7XG5cdFx0XHQgICAgfSk7XG5cblx0XHRcdCAgICAkKG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUpLmJpbmQoJ2tleXVwIG1vdXNldXAnLCBmdW5jdGlvbigpIHtcblx0XHRcdCAgICBcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lICsgJzpjaGVja2VkJykudmFsKClcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0ICAgICAgaWYoJCh0aGlzKS5kYXRhKCdsYXN0LXZhbHVlJykgIT0gJCh0aGlzKS52YWwoKSkge1xuXHRcdFx0ICAgICAgICAkKHRoaXMpLmRhdGEoJ2xhc3QtdmFsdWUnLCAkKHRoaXMpLnZhbCgpKTtcblx0XHRcdCAgICAgICAgbGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX3N0YW5kYWxvbmUgKS52YWwoKSwgJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS5hdHRyKCAnZGF0YS15ZWFyLWZyZXF1ZW5jeScgKSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0ICAgICAgICB0aGF0LnNob3dOZXdMZXZlbCggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdCAgICAgIH07XG5cdFx0XHQgICAgfSk7XG5cblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbHNfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCApLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5mbGlwcGVkX2l0ZW1zLCAkKHRoaXMpICkud3JhcEFsbCggJzxkaXYgY2xhc3M9XCJmbGlwcGVyXCIvPicgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKHRoaXMpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHQgICAgaWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblxuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cblx0XHRcdFx0XHRcdGlmICggZnJlcXVlbmN5ID09IDEgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LXllYXJseScgKSApO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5ID09IDEyICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC1tb250aGx5JyApICk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblxuXHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHR0aGF0LmNoYW5nZUZyZXF1ZW5jeSggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJCggb3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IsIGVsZW1lbnQpLnRleHQoZnJlcXVlbmN5X25hbWUpO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkudmFsKCk7XG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRoYXQuY2hhbmdlQW1vdW50UHJldmlldyggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpLnBhcmVudCgpICkudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIHByZXZpb3VzX2Ftb3VudCwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBsZXZlbEZsaXBwZXJcblxuXHRcdGNoZWNrTGV2ZWw6IGZ1bmN0aW9uKCBhbW91bnQsIGZyZXF1ZW5jeSwgdHlwZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdCAgdmFyIHRoaXN5ZWFyID0gcGFyc2VJbnQoIGFtb3VudCApICogcGFyc2VJbnQoIGZyZXF1ZW5jeSApO1xuXHRcdCAgdmFyIGxldmVsID0gJyc7XG5cdFx0ICBpZiAoIHR5cGVvZiBwcmV2aW91c19hbW91bnQgIT09ICd1bmRlZmluZWQnICYmIHByZXZpb3VzX2Ftb3VudCAhPT0gJycgKSB7XG5cdFx0ICAgIHZhciBwcmlvcl95ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQucHJpb3JfeWVhcl9jb250cmlidXRpb25zICk7XG5cdFx0ICAgIHZhciBjb21pbmdfeWVhcl9hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LmNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMgKTtcblx0XHQgICAgdmFyIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5hbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdCAgICAvLyBjYWxjdWxhdGUgbWVtYmVyIGxldmVsIGZvcm11bGFcblx0XHQgICAgaWYgKCB0eXBlID09PSAnb25lLXRpbWUnICkge1xuXHRcdCAgICAgIHByaW9yX3llYXJfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdCAgICB9IGVsc2Uge1xuXHRcdCAgICAgIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdCAgICB9XG5cblx0XHQgICAgdGhpc3llYXIgPSBNYXRoLm1heCggcHJpb3JfeWVhcl9hbW91bnQsIGNvbWluZ195ZWFyX2Ftb3VudCwgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHQgIH1cblxuXHRcdCAgbGV2ZWwgPSB0aGlzLmdldExldmVsKCB0aGlzeWVhciApO1xuXG5cdFx0ICAkKCdoMicsIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdCAgICBpZiAoICQodGhpcykudGV4dCgpID09IGxldmVsWyduYW1lJ10gKSB7XG5cdFx0ICAgICAgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHQgICAgICAkKHRoaXMpLnBhcmVudCgpLnBhcmVudCgpLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdCAgICB9XG5cdFx0ICB9ICk7XG5cdFx0ICByZXR1cm4gbGV2ZWw7XG5cblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Z2V0TGV2ZWw6IGZ1bmN0aW9uKCB0aGlzeWVhciApIHtcblx0XHRcdHZhciBsZXZlbCA9IFtdO1xuXHRcdFx0aWYgKCB0aGlzeWVhciA+IDAgJiYgdGhpc3llYXIgPCA2MCApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdCcm9uemUnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAxO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodGhpc3llYXIgPiA1OSAmJiB0aGlzeWVhciA8IDEyMCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1NpbHZlcic7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDI7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMTE5ICYmIHRoaXN5ZWFyIDwgMjQwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnR29sZCc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDM7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMjM5KSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnUGxhdGludW0nO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSA0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBnZXRMZXZlbFxuXG5cdFx0c2hvd05ld0xldmVsOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKSB7XG5cdFx0XHR2YXIgbWVtYmVyX2xldmVsX3ByZWZpeCA9ICcnO1xuXHRcdFx0dmFyIG9sZF9sZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgPSBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXI7IC8vIHRoaXMgc2hvdWxkIGNoYW5nZSB3aGVuIHdlIHJlcGxhY2UgdGhlIHRleHQsIGlmIHRoZXJlIGlzIGEgbGluayBpbnNpZGUgaXRcblx0XHRcdHZhciBkZWNvZGVIdG1sRW50aXR5ID0gZnVuY3Rpb24oIHN0ciApIHtcblx0XHRcdFx0cmV0dXJuIHN0ci5yZXBsYWNlKCAvJiMoXFxkKyk7L2csIGZ1bmN0aW9uKCBtYXRjaCwgZGVjICkge1xuXHRcdFx0XHRcdHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKCBkZWMgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0bWVtYmVyX2xldmVsX3ByZWZpeCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5tZW1iZXJfbGV2ZWxfcHJlZml4O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0JChvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIpLnByb3AoICdjbGFzcycsICdhLXNob3ctbGV2ZWwgYS1zaG93LWxldmVsLScgKyBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKTtcblxuXHRcdFx0XHRpZiAoICQoIG9wdGlvbnMudXNlcl9jdXJyZW50X2xldmVsICkubGVuZ3RoID4gMCAmJiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdFx0aWYgKCAnYScsICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHRsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yID0gb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICsgJyBhJztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvbGRfbGV2ZWwgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5yZXBsYWNlKCBtZW1iZXJfbGV2ZWxfcHJlZml4LCAnJyApO1xuXG5cdFx0XHRcdFx0aWYgKCBvbGRfbGV2ZWwgIT09IGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApIHtcblx0XHRcdFx0XHRcdCQoIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5kYXRhKCAnY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoIGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKS5kYXRhKCAnbm90LWNoYW5nZWQnICkgKSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9uYW1lLCBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIpLnRleHQoIGxldmVsWyduYW1lJ10gKTtcblx0XHRcdH1cblxuXHRcdH0sIC8vIGVuZCBzaG93TmV3TGV2ZWxcblxuXHRcdGNoYW5nZUZyZXF1ZW5jeTogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0ICAgIHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdCAgICB2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0ICAgIHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5ICAgICAgPSBwYXJzZUludCggc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzFdICk7XG5cblx0XHRcdCAgICAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS52YWwoIHNlbGVjdGVkICk7XG4gICAgXHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkucHJvcCggJ3NlbGVjdGVkJywgc2VsZWN0ZWQgKTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuICAgIFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLmRhdGEoICdmcmVxdWVuY3knLCBmcmVxdWVuY3kgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VGcmVxdWVuY3lcblxuXHRcdGNoYW5nZUFtb3VudFByZXZpZXc6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdCAgICB2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHQgICAgdmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdCAgICB2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VBbW91bnRQcmV2aWV3XG5cblx0XHRzdGFydExldmVsQ2xpY2s6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnLnN0YXJ0LWxldmVsJykuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBsZXZlbF9jbGFzcyA9ICQoIHRoaXMgKS5wcm9wKCAnY2xhc3MnICk7XG5cdFx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSBsZXZlbF9jbGFzc1tsZXZlbF9jbGFzcy5sZW5ndGggLTFdO1xuXHRcdFx0ICAgICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIsIGVsZW1lbnQgKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCAgICAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKyAnICcgKyBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0ICB9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCApO1xuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCApIHtcblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0VHJhY2tTdWJtaXQnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHR0eXBlOiAnZXZlbnQnLFxuXHRcdGNhdGVnb3J5OiAnU3VwcG9ydCBVcycsXG5cdFx0YWN0aW9uOiAnQmVjb21lIEEgTWVtYmVyJyxcblx0XHRsYWJlbDogbG9jYXRpb24ucGF0aG5hbWVcblx0fTtcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXHRcdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zO1xuXG5cdFx0XHQkKCB0aGlzLmVsZW1lbnQgKS5zdWJtaXQoIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0dGhhdC5hbmFseXRpY3NFdmVudFRyYWNrKFxuXHRcdFx0XHRcdG9wdGlvbnMudHlwZSxcblx0XHRcdFx0XHRvcHRpb25zLmNhdGVnb3J5LFxuXHRcdFx0XHRcdG9wdGlvbnMuYWN0aW9uLFxuXHRcdFx0XHRcdG9wdGlvbnMubGFiZWxcblx0XHRcdFx0KTtcblx0XHRcdFx0Ly8gYWxzbyBidWJibGVzIHRoZSBldmVudCB1cCB0byBzdWJtaXQgdGhlIGZvcm1cblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRhbmFseXRpY3NFdmVudFRyYWNrOiBmdW5jdGlvbiggdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgZ2EgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmICggdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwgKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKTtcblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzRXZlbnRUcmFja1xuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50ICk7XG4iXX0=
