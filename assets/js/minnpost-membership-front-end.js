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
      this.previousAmount = '';

      if (typeof minnpost_membership_data !== 'undefined' && $(this.options.user_current_level).length > 0) {
        this.previousAmount = minnpost_membership_data.current_user.previous_amount;
      }

      this.catchHashLinks(this.element, this.options);
      this.levelViewer();
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
    levelViewer: function levelViewer() {
      var $amount = $(this.options.amount_selector_standalone);
      var $frequency = $(this.options.frequency_selector_standalone);

      if (!($amount.length > 0 && $frequency.length > 0)) {
        return;
      }

      this.checkAndSetLevel();
      $frequency.on('change', this.checkAndSetLevel.bind(this));
      $amount.bind('keyup mouseup', this.onAmountChange.bind(this));
    },
    // end levelViewer
    onAmountChange: function onAmountChange(event) {
      var $target = $(event.target);

      if ($target.data('last-value') != $target.val()) {
        $target.data('last-value', $target.val());
        this.checkAndSetLevel();
      }
    },
    // end onAmountChange
    checkAndSetLevel: function checkAndSetLevel() {
      var amount = $(this.options.amount_selector_standalone).val();
      var frequency_string = $(this.options.frequency_selector_standalone + ':checked').val();
      var frequency = frequency_string.split(' - ')[1];
      var frequency_name = frequency_string.split(' - ')[0];
      var level = this.checkLevel(amount, frequency, frequency_name, this.previousAmount, this.element, this.options);
      this.showNewLevel(this.element, this.options, level);
    },
    // end checkAndSetLevel
    levelFlipper: function levelFlipper(element, options) {
      var that = this;
      var previous_amount = this.previousAmount;
      var amount = 0;
      var level = '';
      var level_number = 0;
      var frequency_string = '';
      var frequency = '';
      var frequency_name = '';

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFtb3VudC1zZWxlY3QuanMiLCJiZW5lZml0cy5qcyIsImN0YS5qcyIsIm1lbWJlci1sZXZlbHMuanMiLCJ0cmFjay1zdWJtaXQuanMiXSwibmFtZXMiOlsiJCIsIndpbmRvdyIsImRvY3VtZW50IiwicGx1Z2luTmFtZSIsImRlZmF1bHRzIiwiZnJlcXVlbmN5U2VsZWN0b3IiLCJhbW91bnRHcm91cCIsImFtb3VudFNlbGVjdG9yIiwiYW1vdW50TGFiZWxzIiwiYW1vdW50VmFsdWUiLCJhbW91bnREZXNjcmlwdGlvbiIsImFtb3VudEZpZWxkIiwiUGx1Z2luIiwiZWxlbWVudCIsIm9wdGlvbnMiLCJleHRlbmQiLCJfZGVmYXVsdHMiLCJfbmFtZSIsImluaXQiLCJwcm90b3R5cGUiLCJmcmVxdWVuY2llcyIsImZpbmQiLCJhbW91bnRzIiwiYW1vdW50Iiwic2V0QW1vdW50TGFiZWxzIiwiZmlsdGVyIiwidmFsIiwiY2hhbmdlIiwib25GcmVxdWVuY3lDaGFuZ2UiLCJiaW5kIiwib24iLCJjbGVhckFtb3VudEZpZWxkIiwiY2xlYXJBbW91bnRTZWxlY3RvciIsImV2ZW50IiwidGFyZ2V0IiwiZnJlcXVlbmN5U3RyaW5nIiwiJGdyb3VwcyIsIiRzZWxlY3RlZCIsImluZGV4IiwiZGF0YSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJwcm9wIiwicmVtb3ZlQXR0ciIsImZuIiwiZWFjaCIsImpRdWVyeSIsImJlbmVmaXRGb3JtIiwicGVyZm9ybWFuY2UiLCJuYXZpZ2F0aW9uIiwidHlwZSIsImxvY2F0aW9uIiwicmVsb2FkIiwiY2xpY2siLCJwcmV2ZW50RGVmYXVsdCIsIiRidXR0b24iLCIkc3RhdHVzIiwicGFyZW50IiwiJHNlbGVjdCIsInNldHRpbmdzIiwibWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncyIsInRleHQiLCJiZW5lZml0VHlwZSIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwiYnV0dG9uX3ZhbHVlIiwiYnV0dG9uX2xhYmVsIiwiYnV0dG9uX2NsYXNzIiwiYnV0dG9uX2F0dHIiLCJodG1sIiwibWVzc2FnZSIsIm1lc3NhZ2VfY2xhc3MiLCJsZW5ndGgiLCJub3QiLCJhdHRyIiwicmVtb3ZlX2luc3RhbmNlX3ZhbHVlIiwic2hvdyIsImhpZGUiLCJpIiwicmVtb3ZlIiwicmVhZHkiLCJtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCIsImNhdGVnb3J5IiwiYWN0aW9uIiwibGFiZWwiLCJ2YWx1ZSIsImdhIiwicGF0aG5hbWUiLCJ1bmRlZmluZWQiLCJyZXNldCIsInByZXZpb3VzQW1vdW50IiwibWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhIiwidXNlcl9jdXJyZW50X2xldmVsIiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwiY2F0Y2hIYXNoTGlua3MiLCJsZXZlbFZpZXdlciIsImxldmVsRmxpcHBlciIsInN0YXJ0TGV2ZWxDbGljayIsImUiLCJyZXBsYWNlIiwiaG9zdG5hbWUiLCJoYXNoIiwic2xpY2UiLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIiwiJGFtb3VudCIsImFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lIiwiJGZyZXF1ZW5jeSIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9zdGFuZGFsb25lIiwiY2hlY2tBbmRTZXRMZXZlbCIsIm9uQW1vdW50Q2hhbmdlIiwiJHRhcmdldCIsImZyZXF1ZW5jeV9zdHJpbmciLCJmcmVxdWVuY3kiLCJzcGxpdCIsImZyZXF1ZW5jeV9uYW1lIiwibGV2ZWwiLCJjaGVja0xldmVsIiwic2hvd05ld0xldmVsIiwidGhhdCIsImxldmVsX251bWJlciIsImxldmVsc19jb250YWluZXIiLCJzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciIsImZsaXBwZWRfaXRlbXMiLCJ3cmFwQWxsIiwiZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyIsInNpbmdsZV9sZXZlbF9jb250YWluZXIiLCJjbG9zZXN0IiwiYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsImFtb3VudF92aWV3ZXIiLCJjaGFuZ2VGcmVxdWVuY3kiLCJsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciIsImNoYW5nZUFtb3VudFByZXZpZXciLCJjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyIsInRoaXN5ZWFyIiwicGFyc2VJbnQiLCJwcmlvcl95ZWFyX2Ftb3VudCIsInByaW9yX3llYXJfY29udHJpYnV0aW9ucyIsImNvbWluZ195ZWFyX2Ftb3VudCIsImNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMiLCJhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCIsIk1hdGgiLCJtYXgiLCJnZXRMZXZlbCIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbF92aWV3ZXJfY29udGFpbmVyX3NlbGVjdG9yIiwibGV2ZWxfdmlld2VyX2NvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJtYXRjaCIsImRlYyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsInRvTG93ZXJDYXNlIiwibWVtYmVyX2xldmVsIiwibGV2ZWxfbmFtZSIsInNlbGVjdGVkIiwicmFuZ2UiLCJtb250aF92YWx1ZSIsInllYXJfdmFsdWUiLCJvbmNlX3ZhbHVlIiwibGV2ZWxfY2xhc3MiLCJzdWJtaXQiLCJhbmFseXRpY3NFdmVudFRyYWNrIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7O0FBQUMsQ0FBQyxVQUFXQSxDQUFYLEVBQWNDLE1BQWQsRUFBc0JDLFFBQXRCLEVBQWlDO0FBQ2xDO0FBQ0EsTUFBSUMsVUFBVSxHQUFHLHNCQUFqQjtBQUFBLE1BQ0FDLFFBQVEsR0FBRztBQUNWQyxJQUFBQSxpQkFBaUIsRUFBRSx5Q0FEVDtBQUVWQyxJQUFBQSxXQUFXLEVBQUUsb0JBRkg7QUFHVkMsSUFBQUEsY0FBYyxFQUFFLHNDQUhOO0FBSVZDLElBQUFBLFlBQVksRUFBRSx3QkFKSjtBQUtWQyxJQUFBQSxXQUFXLEVBQUUsUUFMSDtBQU1WQyxJQUFBQSxpQkFB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LE9BQU9DLEVBQVAsS0FBYyxXQUFuQixFQUFpQztBQUNoQztBQUNBOztBQUVELFVBQUssT0FBT0QsS0FBUCxLQUFpQixXQUF0QixFQUFvQztBQUNuQ0MsUUFBQUEsRUFBRSxDQUFFLE1BQUYsRUFBVXRDLElBQVYsRUFBZ0JrQyxRQUFoQixFQUEwQkMsTUFBMUIsRUFBa0NDLEtBQWxDLENBQUY7QUFDQTtBQUNBOztBQUVERSxNQUFBQSxFQUFFLENBQUUsTUFBRixFQUFVdEMsSUFBVixFQUFnQmtDLFFBQWhCLEVBQTBCQyxNQUExQixFQUFrQ0MsS0FBbEMsRUFBeUNDLEtBQXpDLENBQUY7QUFDQSxLQTNCaUIsQ0EyQmY7O0FBM0JlLEdBQW5CLENBMUJrQyxDQXNEL0I7QUFHSDtBQUNBOztBQUNBdkYsRUFBQUEsQ0FBQyxDQUFDNEMsRUFBRixDQUFLekMsVUFBTCxJQUFtQixVQUFXVyxPQUFYLEVBQXFCO0FBQ3ZDLFdBQU8sS0FBSytCLElBQUwsQ0FBVSxZQUFZO0FBQzVCLFVBQUssQ0FBRTdDLENBQUMsQ0FBQ3VDLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXBDLFVBQTFCLENBQVAsRUFBZ0Q7QUFDL0NILFFBQUFBLENBQUMsQ0FBQ3VDLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXBDLFVBQTFCLEVBQXNDLElBQUlTLE1BQUosQ0FBWSxJQUFaLEVBQWtCRSxPQUFsQixDQUF0QztBQUNBO0FBQ0QsS0FKTSxDQUFQO0FBS0EsR0FORDtBQU9BLENBbEVBLEVBa0VHZ0MsTUFsRUgsRUFrRVc3QyxNQWxFWCxFQWtFbUJDLFFBbEVuQiIsImZpbGUiOiJtaW5ucG9zdC1tZW1iZXJzaGlwLWZyb250LWVuZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQgKSB7XG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdEFtb3VudFNlbGVjdCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdGZyZXF1ZW5jeVNlbGVjdG9yOiAnLm0tZnJlcXVlbmN5LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGFtb3VudEdyb3VwOiAnLm0tZnJlcXVlbmN5LWdyb3VwJyxcblx0XHRhbW91bnRTZWxlY3RvcjogJy5tLWFtb3VudC1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRhbW91bnRMYWJlbHM6ICcubS1hbW91bnQtc2VsZWN0IGxhYmVsJyxcblx0XHRhbW91bnRWYWx1ZTogJ3N0cm9uZycsXG5cdFx0YW1vdW50RGVzY3JpcHRpb246ICcuYS1hbW91bnQtZGVzY3JpcHRpb24nLFxuXHRcdGFtb3VudEZpZWxkOiAnLmEtYW1vdW50LWZpZWxkICNhbW91bnQnXG5cdH07XG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblx0XHRpbml0OiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBmcmVxdWVuY2llcyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciApO1xuXHRcdFx0dmFyIGFtb3VudHMgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKTtcblx0XHRcdHZhciBhbW91bnQgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQgKTtcblxuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoIGZyZXF1ZW5jaWVzLmZpbHRlcignOmNoZWNrZWQnKS52YWwoKSApO1xuXHRcdFx0ZnJlcXVlbmNpZXMuY2hhbmdlKCB0aGlzLm9uRnJlcXVlbmN5Q2hhbmdlLmJpbmQodGhpcykgKTtcblx0XHRcdGFtb3VudHMub24oICdjaGFuZ2UnLCB0aGlzLmNsZWFyQW1vdW50RmllbGQuYmluZCh0aGlzKSApO1xuXHRcdFx0YW1vdW50Lm9uKCAna2V5dXAgbW91c2V1cCcsIHRoaXMuY2xlYXJBbW91bnRTZWxlY3Rvci5iaW5kKHRoaXMpICk7XG5cdFx0fSxcblxuXHRcdG9uRnJlcXVlbmN5Q2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR0aGlzLnNldEFtb3VudExhYmVscyggJCggZXZlbnQudGFyZ2V0ICkudmFsKCkgKTtcblx0XHR9LFxuXG5cdFx0c2V0QW1vdW50TGFiZWxzOiBmdW5jdGlvbiggZnJlcXVlbmN5U3RyaW5nICkge1xuXHRcdFx0dmFyICRncm91cHMgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50R3JvdXAgKTtcblx0XHRcdHZhciAkc2VsZWN0ZWQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKVxuXHRcdFx0ICAgIC5maWx0ZXIoICc6Y2hlY2tlZCcgKTtcblx0XHRcdHZhciBpbmRleCA9ICRzZWxlY3RlZC5kYXRhKCAnaW5kZXgnICk7XG5cblx0XHRcdCRncm91cHMucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQkZ3JvdXBzLmZpbHRlciggJ1tkYXRhLWZyZXF1ZW5jeT1cIicgKyBmcmVxdWVuY3lTdHJpbmcgKyAnXCJdJyApXG5cdFx0XHRcdC5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCRzZWxlY3RlZC5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0XHQkZ3JvdXBzLmZpbHRlciggJy5hY3RpdmUnIClcblx0XHRcdFx0LmZpbmQoICdpbnB1dFt0eXBlPVwicmFkaW9cIl1bZGF0YS1pbmRleD1cIicgKyBpbmRleCArICdcIl0nIClcblx0XHRcdFx0LnByb3AoICdjaGVja2VkJywgdHJ1ZSApO1xuXHRcdH0sIC8vIGVuZCBzZXRBbW91bnRMYWJlbHNcblxuXHRcdGNsZWFyQW1vdW50U2VsZWN0b3I6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciBhbW91bnRzID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yICk7XG5cblx0XHRcdGlmICggJCggZXZlbnQudGFyZ2V0ICkudmFsKCkgPT09ICcnICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGFtb3VudHMucmVtb3ZlQXR0cignY2hlY2tlZCcpO1xuXHRcdH0sXG5cblx0XHRjbGVhckFtb3VudEZpZWxkOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHQkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQgKS52YWwoIG51bGwgKTtcblx0XHR9LFxuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50ICk7XG4iLCIoIGZ1bmN0aW9uKCAkICkge1xuXG5cdGZ1bmN0aW9uIGJlbmVmaXRGb3JtKCkge1xuXHRcdGlmICggMiA9PT0gcGVyZm9ybWFuY2UubmF2aWdhdGlvbi50eXBlICkge1xuXHRcdFx0bG9jYXRpb24ucmVsb2FkKCB0cnVlICk7XG5cdFx0fVxuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbi5hLWJ1dHRvbi1kaXNhYmxlZCcgKS5yZW1vdmVBdHRyKCAnZGlzYWJsZWQnICk7XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0dmFyICRidXR0b24gID0gJCggdGhpcyApO1xuXHRcdFx0dmFyICRzdGF0dXMgID0gJCggJy5tLWJlbmVmaXQtbWVzc2FnZScsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyICRzZWxlY3QgID0gJCggJ3NlbGVjdCcsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyIHNldHRpbmdzID0gbWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncztcblx0XHRcdC8vIHJlc2V0IHRoZSBtZXNzYWdlIGZvciBjdXJyZW50IHN0YXR1c1xuXHRcdFx0aWYgKCAhICcubS1iZW5lZml0LW1lc3NhZ2Utc3VjY2VzcycgKSB7XG5cdFx0XHRcdCQoICcubS1iZW5lZml0LW1lc3NhZ2UnICkucmVtb3ZlQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlIG0tYmVuZWZpdC1tZXNzYWdlLWVycm9yIG0tYmVuZWZpdC1tZXNzYWdlLWluZm8nICk7XG5cdFx0XHR9XG5cdFx0XHQvLyBzZXQgYnV0dG9uIHRvIHByb2Nlc3Npbmdcblx0XHRcdCRidXR0b24udGV4dCggJ1Byb2Nlc3NpbmcnICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gZGlzYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXG5cdFx0XHQvLyBzZXQgYWpheCBkYXRhXG5cdFx0XHR2YXIgZGF0YSA9IHt9O1xuXHRcdFx0dmFyIGJlbmVmaXRUeXBlID0gJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nICkudmFsKCk7XG5cdFx0XHRpZiAoICdwYXJ0bmVyLW9mZmVycycgPT09IGJlbmVmaXRUeXBlICkge1xuXHRcdFx0XHRkYXRhID0ge1xuXHRcdFx0XHRcdCdhY3Rpb24nIDogJ2JlbmVmaXRfZm9ybV9zdWJtaXQnLFxuXHRcdFx0XHRcdCdtaW5ucG9zdF9tZW1iZXJzaGlwX2JlbmVmaXRfZm9ybV9ub25jZScgOiAkYnV0dG9uLmRhdGEoICdiZW5lZml0LW5vbmNlJyApLFxuXHRcdFx0XHRcdCdjdXJyZW50X3VybCcgOiAkKCAnaW5wdXRbbmFtZT1cImN1cnJlbnRfdXJsXCJdJykudmFsKCksXG5cdFx0XHRcdFx0J2JlbmVmaXQtbmFtZSc6ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJykudmFsKCksXG5cdFx0XHRcdFx0J2luc3RhbmNlX2lkJyA6ICQoICdbbmFtZT1cImluc3RhbmNlLWlkLScgKyAkYnV0dG9uLnZhbCgpICsgJ1wiXScgKS52YWwoKSxcblx0XHRcdFx0XHQncG9zdF9pZCcgOiAkYnV0dG9uLnZhbCgpLFxuXHRcdFx0XHRcdCdpc19hamF4JyA6ICcxJyxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkLnBvc3QoIHNldHRpbmdzLmFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0XHQvLyBzdWNjZXNzXG5cdFx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdFx0XHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHRcdFx0aWYgKCAwIDwgJHNlbGVjdC5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRcdCRzZWxlY3QucHJvcCggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS5hdHRyKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vIGVycm9yXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiByZXNwb25zZS5kYXRhLnJlbW92ZV9pbnN0YW5jZV92YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0JCggJ29wdGlvbicsICRzZWxlY3QgKS5lYWNoKCBmdW5jdGlvbiggaSApIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoICQoIHRoaXMgKS52YWwoKSA9PT0gcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHQkKCB0aGlzICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ly8gcmUtZW5hYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0XHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0XHQkc3RhdHVzLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmFkZENsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzICk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCAwIDwgJCggJy5tLWZvcm0tbWVtYmVyc2hpcC1iZW5lZml0JyApLmxlbmd0aCApIHtcblx0XHRcdGJlbmVmaXRGb3JtKCk7XG5cdFx0fVxuXHR9KTtcblxuXHQkKCAnLmEtcmVmcmVzaC1wYWdlJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRsb2NhdGlvbi5yZWxvYWQoKTtcblx0fSk7XG5cbn0gKSggalF1ZXJ5ICk7XG4iLCIoIGZ1bmN0aW9uKCAkICkge1xuXHRmdW5jdGlvbiBtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCggdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICkge1xuXHRcdGlmICggdHlwZW9mIGdhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdGlmICggdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7IFxuXHRcdCQoICcubS1zdXBwb3J0LWN0YS10b3AgLmEtc3VwcG9ydC1idXR0b24nICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciB2YWx1ZSA9ICcnO1xuXHRcdFx0aWYgKCAkKCAnc3ZnJywgJCggdGhpcyApICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0dmFsdWUgPSAkKCAnc3ZnJywgJCggdGhpcyApICkuYXR0ciggJ3RpdGxlJyApICsgJyAnO1xuXHRcdFx0fVxuXHRcdFx0dmFsdWUgPSB2YWx1ZSArICQoIHRoaXMgKS50ZXh0KCk7XG5cdFx0XHRtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCggJ2V2ZW50JywgJ1N1cHBvcnQgQ1RBIC0gSGVhZGVyJywgJ0NsaWNrOiAnICsgdmFsdWUsIGxvY2F0aW9uLnBhdGhuYW1lICk7XG5cdFx0fSk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgdW5kZWZpbmVkICkge1xuXG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHQnZGVidWcnIDogZmFsc2UsIC8vIHRoaXMgY2FuIGJlIHNldCB0byB0cnVlIG9uIHBhZ2UgbGV2ZWwgb3B0aW9uc1xuXHRcdCdhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZScgOiAnI2Ftb3VudC1pdGVtICNhbW91bnQnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZScgOiAnLm0tbWVtYmVyc2hpcC1mYXN0LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdCdsZXZlbF92aWV3ZXJfY29udGFpbmVyJyA6ICcuYS1zaG93LWxldmVsJyxcblx0XHQnbGV2ZWxfbmFtZScgOiAnLmEtbGV2ZWwnLFxuXHRcdCd1c2VyX2N1cnJlbnRfbGV2ZWwnIDogJy5hLWN1cnJlbnQtbGV2ZWwnLFxuXHRcdCd1c2VyX25ld19sZXZlbCcgOiAnLmEtbmV3LWxldmVsJyxcblx0XHQnYW1vdW50X3ZpZXdlcicgOiAnLmFtb3VudCBoMycsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hLWZvcm0taXRlbS1tZW1iZXJzaGlwLWZyZXF1ZW5jeScsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHNfdHlwZScgOiAnc2VsZWN0Jyxcblx0XHQnbGV2ZWxzX2NvbnRhaW5lcicgOiAnLm8tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWxzJyxcblx0XHQnc2luZ2xlX2xldmVsX2NvbnRhaW5lcicgOiAnLm0tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWwnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcicgOiAnLm0tbWVtYmVyLWxldmVsLWJyaWVmJyxcblx0XHQnZmxpcHBlZF9pdGVtcycgOiAnZGl2LmFtb3VudCwgZGl2LmVudGVyJyxcblx0XHQnbGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3InIDogJy5zaG93LWZyZXF1ZW5jeScsXG5cdFx0J2Nob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYW1vdW50IC5hLWJ1dHRvbi1mbGlwJyxcblx0XHQnYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmVudGVyIGlucHV0LmFtb3VudC1lbnRyeScsXG5cdH07IC8vIGVuZCBkZWZhdWx0c1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblxuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblxuXHRcdGluaXQ6IGZ1bmN0aW9uKCByZXNldCwgYW1vdW50ICkge1xuXHRcdFx0Ly8gUGxhY2UgaW5pdGlhbGl6YXRpb24gbG9naWMgaGVyZVxuXHRcdFx0Ly8gWW91IGFscmVhZHkgaGF2ZSBhY2Nlc3MgdG8gdGhlIERPTSBlbGVtZW50IGFuZFxuXHRcdFx0Ly8gdGhlIG9wdGlvbnMgdmlhIHRoZSBpbnN0YW5jZSwgZS5nLiB0aGlzLmVsZW1lbnRcblx0XHRcdC8vIGFuZCB0aGlzLm9wdGlvbnNcblx0XHRcdC8vIHlvdSBjYW4gYWRkIG1vcmUgZnVuY3Rpb25zIGxpa2UgdGhlIG9uZSBiZWxvdyBhbmRcblx0XHRcdC8vIGNhbGwgdGhlbSBsaWtlIHNvOiB0aGlzLnlvdXJPdGhlckZ1bmN0aW9uKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKS5cblx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQgPSAnJztcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgJiYgJCggdGhpcy5vcHRpb25zLnVzZXJfY3VycmVudF9sZXZlbCApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudDtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5jYXRjaEhhc2hMaW5rcyggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5sZXZlbFZpZXdlcigpO1xuXHRcdFx0dGhpcy5sZXZlbEZsaXBwZXIoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN0YXJ0TGV2ZWxDbGljayggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHR9LFxuXG5cdFx0Y2F0Y2hIYXNoTGlua3M6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnYVtocmVmKj1cIiNcIl06bm90KFtocmVmPVwiI1wiXSknLCBlbGVtZW50KS5jbGljayhmdW5jdGlvbihlKSB7XG5cdFx0XHRcdHZhciB0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblx0XHRcdFx0aWYgKHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiYgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpID09IHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpICYmIGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWUpIHtcblx0XHRcdFx0XHR2YXIgdGFyZ2V0ID0gJCh0aGlzLmhhc2gpO1xuXHRcdFx0XHRcdHRhcmdldCA9IHRhcmdldC5sZW5ndGggPyB0YXJnZXQgOiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsnXScpO1xuXHRcdFx0XHRcdGlmICh0YXJnZXQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQkKCdodG1sLGJvZHknKS5hbmltYXRlKHtcblx0XHRcdFx0XHRcdFx0c2Nyb2xsVG9wOiB0YXJnZXQub2Zmc2V0KCkudG9wXG5cdFx0XHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbFZpZXdlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgJGFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApO1xuXHRcdFx0dmFyICRmcmVxdWVuY3kgPSAkKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKTtcblx0XHRcdGlmICggISggJGFtb3VudC5sZW5ndGggPiAwICYmICRmcmVxdWVuY3kubGVuZ3RoID4gMCApICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCgpO1xuXHRcdFx0JGZyZXF1ZW5jeS5vbignY2hhbmdlJywgdGhpcy5jaGVja0FuZFNldExldmVsLmJpbmQoIHRoaXMgKSApO1xuXHRcdFx0JGFtb3VudC5iaW5kKCdrZXl1cCBtb3VzZXVwJywgdGhpcy5vbkFtb3VudENoYW5nZS5iaW5kKCB0aGlzICkgKTtcblx0XHR9LCAvLyBlbmQgbGV2ZWxWaWV3ZXJcblxuXHRcdG9uQW1vdW50Q2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgJHRhcmdldCA9ICQoIGV2ZW50LnRhcmdldCApO1xuXHRcdFx0aWYgKCAkdGFyZ2V0LmRhdGEoICdsYXN0LXZhbHVlJyApICE9ICR0YXJnZXQudmFsKCkgKSB7XG5cdFx0XHRcdCR0YXJnZXQuZGF0YSggJ2xhc3QtdmFsdWUnLCAkdGFyZ2V0LnZhbCgpICk7XG5cdFx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCgpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBvbkFtb3VudENoYW5nZVxuXG5cdFx0Y2hlY2tBbmRTZXRMZXZlbDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgYW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkudmFsKCk7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdHZhciBmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHR2YXIgbGV2ZWwgPSB0aGlzLmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgdGhpcy5wcmV2aW91c0Ftb3VudCwgdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuc2hvd05ld0xldmVsKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucywgbGV2ZWwgKTtcblx0XHR9LCAvLyBlbmQgY2hlY2tBbmRTZXRMZXZlbFxuXG5cdFx0bGV2ZWxGbGlwcGVyOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBwcmV2aW91c19hbW91bnQgPSB0aGlzLnByZXZpb3VzQW1vdW50O1xuXHRcdFx0dmFyIGFtb3VudCA9IDA7XG5cdFx0XHR2YXIgbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSAwO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3kgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9ICcnO1xuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxzX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQgKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuZmxpcHBlZF9pdGVtcywgJCh0aGlzKSApLndyYXBBbGwoICc8ZGl2IGNsYXNzPVwiZmxpcHBlclwiLz4nICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCh0aGlzKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0XHRpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBmcmVxdWVuY3kgPT0gMSApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQteWVhcmx5JyApICk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3kgPT0gMTIgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LW1vbnRobHknICkgKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXG5cdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlRnJlcXVlbmN5KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAkKCBvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciwgZWxlbWVudCkudGV4dChmcmVxdWVuY3lfbmFtZSk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS52YWwoKTtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dGhhdC5jaGFuZ2VBbW91bnRQcmV2aWV3KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykucGFyZW50KCkgKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgcHJldmlvdXNfYW1vdW50LCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGxldmVsRmxpcHBlclxuXG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlLCBwcmV2aW91c19hbW91bnQsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgdGhpc3llYXIgPSBwYXJzZUludCggYW1vdW50ICkgKiBwYXJzZUludCggZnJlcXVlbmN5ICk7XG5cdFx0XHR2YXIgbGV2ZWwgPSAnJztcblx0XHRcdGlmICggdHlwZW9mIHByZXZpb3VzX2Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgJiYgcHJldmlvdXNfYW1vdW50ICE9PSAnJyApIHtcblx0XHRcdFx0dmFyIHByaW9yX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHByZXZpb3VzX2Ftb3VudC5wcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMgKTtcblx0XHRcdFx0dmFyIGNvbWluZ195ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCBwcmV2aW91c19hbW91bnQuY29taW5nX3llYXJfY29udHJpYnV0aW9ucyApO1xuXHRcdFx0XHR2YXIgYW5udWFsX3JlY3VycmluZ19hbW91bnQgPSBwYXJzZUludCggcHJldmlvdXNfYW1vdW50LmFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0XHRcdC8vIGNhbGN1bGF0ZSBtZW1iZXIgbGV2ZWwgZm9ybXVsYVxuXHRcdFx0XHRpZiAoIHR5cGUgPT09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cHJpb3JfeWVhcl9hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0YW5udWFsX3JlY3VycmluZ19hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGlzeWVhciA9IE1hdGgubWF4KCBwcmlvcl95ZWFyX2Ftb3VudCwgY29taW5nX3llYXJfYW1vdW50LCBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdFx0fVxuXG5cdFx0XHRsZXZlbCA9IHRoaXMuZ2V0TGV2ZWwoIHRoaXN5ZWFyICk7XG5cblx0XHRcdCQoJ2gyJywgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWxbJ25hbWUnXSApIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQodGhpcykucGFyZW50KCkucGFyZW50KCkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHRcdHJldHVybiBsZXZlbDtcblxuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRnZXRMZXZlbDogZnVuY3Rpb24oIHRoaXN5ZWFyICkge1xuXHRcdFx0dmFyIGxldmVsID0gW107XG5cdFx0XHRpZiAoIHRoaXN5ZWFyID4gMCAmJiB0aGlzeWVhciA8IDYwICkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0Jyb256ZSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDE7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0aGlzeWVhciA+IDU5ICYmIHRoaXN5ZWFyIDwgMTIwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnU2lsdmVyJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMjtcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAxMTkgJiYgdGhpc3llYXIgPCAyNDApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdHb2xkJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMztcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAyMzkpIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdQbGF0aW51bSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGdldExldmVsXG5cblx0XHRzaG93TmV3TGV2ZWw6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApIHtcblx0XHRcdHZhciBtZW1iZXJfbGV2ZWxfcHJlZml4ID0gJyc7XG5cdFx0XHR2YXIgb2xkX2xldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciA9IG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcjsgLy8gdGhpcyBzaG91bGQgY2hhbmdlIHdoZW4gd2UgcmVwbGFjZSB0aGUgdGV4dCwgaWYgdGhlcmUgaXMgYSBsaW5rIGluc2lkZSBpdFxuXHRcdFx0dmFyIGRlY29kZUh0bWxFbnRpdHkgPSBmdW5jdGlvbiggc3RyICkge1xuXHRcdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoIC8mIyhcXGQrKTsvZywgZnVuY3Rpb24oIG1hdGNoLCBkZWMgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoIGRlYyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRtZW1iZXJfbGV2ZWxfcHJlZml4ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLm1lbWJlcl9sZXZlbF9wcmVmaXg7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcikucHJvcCggJ2NsYXNzJywgJ2Etc2hvdy1sZXZlbCBhLXNob3ctbGV2ZWwtJyArIGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApO1xuXG5cdFx0XHRcdGlmICggJCggb3B0aW9ucy51c2VyX2N1cnJlbnRfbGV2ZWwgKS5sZW5ndGggPiAwICYmIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0XHRpZiAoICdhJywgJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgPSBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKyAnIGEnO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG9sZF9sZXZlbCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLnJlcGxhY2UoIG1lbWJlcl9sZXZlbF9wcmVmaXgsICcnICk7XG5cblx0XHRcdFx0XHRpZiAoIG9sZF9sZXZlbCAhPT0gbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICkge1xuXHRcdFx0XHRcdFx0JCggbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmRhdGEoICdjaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmRhdGEoICdub3QtY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0JChvcHRpb25zLmxldmVsX25hbWUsIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcikudGV4dCggbGV2ZWxbJ25hbWUnXSApO1xuXHRcdFx0fVxuXG5cdFx0fSwgLy8gZW5kIHNob3dOZXdMZXZlbFxuXG5cdFx0Y2hhbmdlRnJlcXVlbmN5OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHRcdHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdFx0dmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHR2YXIgZnJlcXVlbmN5ICAgICAgPSBwYXJzZUludCggc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzFdICk7XG5cblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkudmFsKCBzZWxlY3RlZCApO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5wcm9wKCAnc2VsZWN0ZWQnLCBzZWxlY3RlZCApO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLmRhdGEoICdmcmVxdWVuY3knLCBmcmVxdWVuY3kgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VGcmVxdWVuY3lcblxuXHRcdGNoYW5nZUFtb3VudFByZXZpZXc6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdFx0dmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0XHR2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VBbW91bnRQcmV2aWV3XG5cblx0XHRzdGFydExldmVsQ2xpY2s6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnLnN0YXJ0LWxldmVsJykuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBsZXZlbF9jbGFzcyA9ICQoIHRoaXMgKS5wcm9wKCAnY2xhc3MnICk7XG5cdFx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSBsZXZlbF9jbGFzc1tsZXZlbF9jbGFzcy5sZW5ndGggLTFdO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciwgZWxlbWVudCApLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKyAnICcgKyBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIHN0YXJ0TGV2ZWxDbGlja1xuXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG5cbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQgKSB7XG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdFRyYWNrU3VibWl0Jyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0dHlwZTogJ2V2ZW50Jyxcblx0XHRjYXRlZ29yeTogJ1N1cHBvcnQgVXMnLFxuXHRcdGFjdGlvbjogJ0JlY29tZSBBIE1lbWJlcicsXG5cdFx0bGFiZWw6IGxvY2F0aW9uLnBhdGhuYW1lXG5cdH07XG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblx0XHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcblxuXHRcdFx0JCggdGhpcy5lbGVtZW50ICkuc3VibWl0KCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdHRoYXQuYW5hbHl0aWNzRXZlbnRUcmFjayhcblx0XHRcdFx0XHRvcHRpb25zLnR5cGUsXG5cdFx0XHRcdFx0b3B0aW9ucy5jYXRlZ29yeSxcblx0XHRcdFx0XHRvcHRpb25zLmFjdGlvbixcblx0XHRcdFx0XHRvcHRpb25zLmxhYmVsXG5cdFx0XHRcdCk7XG5cdFx0XHRcdC8vIGFsc28gYnViYmxlcyB0aGUgZXZlbnQgdXAgdG8gc3VibWl0IHRoZSBmb3JtXG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0YW5hbHl0aWNzRXZlbnRUcmFjazogZnVuY3Rpb24oIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApIHtcblx0XHRcdGlmICggdHlwZW9mIGdhID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICk7XG5cdFx0fSwgLy8gZW5kIGFuYWx5dGljc0V2ZW50VHJhY2tcblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCApO1xuIl19
