"use strict";

;

(function (window) {
  function MinnPostMembership(data, settings) {
    this.data = {};

    if (typeof data !== 'undefined') {
      this.data = data;
    }

    this.settings = {};

    if (typeof settings !== 'undefined') {
      this.settings = settings;
    }

    this.previousAmount = '';

    if (typeof this.data.current_user !== 'undefined' && typeof this.data.current_user.previous_amount !== 'undefined') {
      this.previousAmount = this.data.current_user.previous_amount;
    }
  }

  MinnPostMembership.prototype = {
    checkLevel: function checkLevel(amount, frequency, type) {
      var thisyear = parseInt(amount) * parseInt(frequency);

      if (typeof this.previousAmount !== 'undefined' && this.previousAmount !== '') {
        var prior_year_amount = parseInt(this.previousAmount.prior_year_contributions, 10);
        var coming_year_amount = parseInt(this.previousAmount.coming_year_contributions, 10);
        var annual_recurring_amount = parseInt(this.previousAmount.annual_recurring_amount, 10); // calculate member level formula

        if (type === 'one-time') {
          prior_year_amount += thisyear;
        } else {
          annual_recurring_amount += thisyear;
        }

        thisyear = Math.max(prior_year_amount, coming_year_amount, annual_recurring_amount);
      }

      return this.getLevel(thisyear);
    },
    // end checkLevel
    getLevel: function getLevel(thisyear) {
      var level = {};

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
    } // end getLevel

  };
  window.MinnPostMembership = new MinnPostMembership(window.minnpost_membership_data, window.minnpost_membership_settings);
})(window);
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

(function ($, window, document, MinnPostMembership, undefined) {
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
      var level = this.checkLevel(amount, frequency, frequency_name, this.element, this.options);
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
            level = that.checkLevel(amount, frequency, frequency_name, element, options);
            that.changeFrequency(frequency_string, level['name'], element, options);
          } else if ($(options.level_frequency_text_selector).length > 0) {
            $(options.level_frequency_text_selector, element).text(frequency_name);
            $(options.single_level_container).each(function () {
              level_number = $(options.amount_selector_in_levels, $(this)).data('member-level-number');

              if (typeof level_number !== 'undefined') {
                amount = $(options.amount_selector_in_levels, $(this)).val();
                level = that.checkLevel(amount, frequency, frequency_name, element, options);
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
          level = that.checkLevel(amount, frequency, frequency_name, element, options);
          event.preventDefault();
        });
      }
    },
    // end levelFlipper
    checkLevel: function checkLevel(amount, frequency, type, element, options) {
      var level = MinnPostMembership.checkLevel(amount, frequency, type);
      $('h2', options.single_level_summary_selector).each(function () {
        if ($(this).text() == level['name']) {
          $(options.single_level_container, element).removeClass('active');
          $(this).parent().parent().addClass('active');
        }
      });
      return level;
    },
    // end checkLevel
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
})(jQuery, window, document, MinnPostMembership);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIiwidHJhY2stc3VibWl0LmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsIm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCIkIiwiZG9jdW1lbnQiLCJwbHVnaW5OYW1lIiwiZGVmYXVsdHMiLCJmcmVxdWVuY3lTZWxlY3RvciIsImFtb3VudEdyb3VwIiwiYW1vdW50U2VsZWN0b3IiLCJhbW91bnRMYWJlbHMiLCJhbW91bnRWYWx1ZSIsImFtb3VudERlc2NyaXB0aW9uIiwiYW1vdW50RmllbGQiLCJQbHVnaW4iLCJlbGVtZW50Iiwib3B0aW9ucyIsImV4dGVuZCIsIl9kZWZhdWx0cyIsIl9uYW1lIiwiaW5pdCIsImZyZXF1ZW5jaWVzIiwiZmluZCIsImFtb3VudHMiLCJzZXRBbW91bnRMYWJlbHMiLCJmaWx0ZXIiLCJ2YWwiLCJjaGFuZ2UiLCJvbkZyZXF1ZW5jeUNoYW5nZSIsImJpbmQiLCJvbiIsImNsZWFyQW1vdW50RmllbGQiLCJjbGVhckFtb3VudFNlbGVjdG9yIiwiZXZlbnQiLCJ0YXJnZXQiLCJmcmVxdWVuY3lTdHJpbmciLCIkZ3JvdXBzIiwiJHNlbGVjdGVkIiwiaW5kZXgiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwicHJvcCIsInJlbW92ZUF0dHIiLCJmbiIsImVhY2giLCJqUXVlcnkiLCJiZW5lZml0Rm9ybSIsInBlcmZvcm1hbmNlIiwibmF2aWdhdGlvbiIsImxvY2F0aW9uIiwicmVsb2FkIiwiY2xpY2siLCJwcmV2ZW50RGVmYXVsdCIsIiRidXR0b24iLCIkc3RhdHVzIiwicGFyZW50IiwiJHNlbGVjdCIsInRleHQiLCJiZW5lZml0VHlwZSIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwiYnV0dG9uX3ZhbHVlIiwiYnV0dG9uX2xhYmVsIiwiYnV0dG9uX2NsYXNzIiwiYnV0dG9uX2F0dHIiLCJodG1sIiwibWVzc2FnZSIsIm1lc3NhZ2VfY2xhc3MiLCJsZW5ndGgiLCJub3QiLCJhdHRyIiwicmVtb3ZlX2luc3RhbmNlX3ZhbHVlIiwic2hvdyIsImhpZGUiLCJpIiwicmVtb3ZlIiwicmVhZHkiLCJtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCIsImNhdGVnb3J5IiwiYWN0aW9uIiwibGFiZWwiLCJ2YWx1ZSIsImdhIiwicGF0aG5hbWUiLCJ1bmRlZmluZWQiLCJyZXNldCIsInVzZXJfY3VycmVudF9sZXZlbCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxWaWV3ZXIiLCJsZXZlbEZsaXBwZXIiLCJzdGFydExldmVsQ2xpY2siLCJlIiwicmVwbGFjZSIsImhvc3RuYW1lIiwiaGFzaCIsInNsaWNlIiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsIm9mZnNldCIsInRvcCIsIiRhbW91bnQiLCJhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsIiRmcmVxdWVuY3kiLCJmcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSIsImNoZWNrQW5kU2V0TGV2ZWwiLCJvbkFtb3VudENoYW5nZSIsIiR0YXJnZXQiLCJmcmVxdWVuY3lfc3RyaW5nIiwic3BsaXQiLCJmcmVxdWVuY3lfbmFtZSIsInNob3dOZXdMZXZlbCIsInRoYXQiLCJsZXZlbF9udW1iZXIiLCJsZXZlbHNfY29udGFpbmVyIiwic2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IiLCJmbGlwcGVkX2l0ZW1zIiwid3JhcEFsbCIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJzaW5nbGVfbGV2ZWxfY29udGFpbmVyIiwiY2xvc2VzdCIsImFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJhbW91bnRfdmlld2VyIiwiY2hhbmdlRnJlcXVlbmN5IiwibGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IiLCJjaGFuZ2VBbW91bnRQcmV2aWV3IiwiY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJtZW1iZXJfbGV2ZWxfcHJlZml4Iiwib2xkX2xldmVsIiwibGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciIsImxldmVsX3ZpZXdlcl9jb250YWluZXIiLCJkZWNvZGVIdG1sRW50aXR5Iiwic3RyIiwibWF0Y2giLCJkZWMiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJ0b0xvd2VyQ2FzZSIsIm1lbWJlcl9sZXZlbCIsImxldmVsX25hbWUiLCJzZWxlY3RlZCIsInJhbmdlIiwibW9udGhfdmFsdWUiLCJ5ZWFyX3ZhbHVlIiwib25jZV92YWx1ZSIsImxldmVsX2NsYXNzIiwic3VibWl0IiwiYW5hbHl0aWNzRXZlbnRUcmFjayJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7QUFBQyxDQUFDLFVBQVdBLE1BQVgsRUFBb0I7QUFDckIsV0FBU0Msa0JBQVQsQ0FBNkJDLElBQTdCLEVBQW1DQyxRQUFuQyxFQUE4QztBQUM3QyxTQUFLRCxJQUFMLEdBQVksRUFBWjs7QUFDQSxRQUFJLE9BQU9BLElBQVAsS0FBZ0IsV0FBcEIsRUFBaUM7QUFDaEMsV0FBS0EsSUFBTCxHQUFZQSxJQUFaO0FBQ0E7O0FBRUQsU0FBS0MsUUFBTCxHQUFnQixFQUFoQjs7QUFDQSxRQUFJLE9BQU9B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QUFuQixFQUFpQztBQUNoQztBQUNBOztBQUVELFVBQUssT0FBT0QsS0FBUCxLQUFpQixXQUF0QixFQUFvQztBQUNuQ0MsUUFBQUEsRUFBRSxDQUFFLE1BQUYsRUFBVS9GLElBQVYsRUFBZ0IyRixRQUFoQixFQUEwQkMsTUFBMUIsRUFBa0NDLEtBQWxDLENBQUY7QUFDQTtBQUNBOztBQUVERSxNQUFBQSxFQUFFLENBQUUsTUFBRixFQUFVL0YsSUFBVixFQUFnQjJGLFFBQWhCLEVBQTBCQyxNQUExQixFQUFrQ0MsS0FBbEMsRUFBeUNDLEtBQXpDLENBQUY7QUFDQSxLQTNCaUIsQ0EyQmY7O0FBM0JlLEdBQW5CLENBMUJrQyxDQXNEL0I7QUFHSDtBQUNBOztBQUNBaEYsRUFBQUEsQ0FBQyxDQUFDd0MsRUFBRixDQUFLdEMsVUFBTCxJQUFtQixVQUFXVyxPQUFYLEVBQXFCO0FBQ3ZDLFdBQU8sS0FBSzRCLElBQUwsQ0FBVSxZQUFZO0FBQzVCLFVBQUssQ0FBRXpDLENBQUMsQ0FBQ3ZCLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXlCLFVBQTFCLENBQVAsRUFBZ0Q7QUFDL0NGLFFBQUFBLENBQUMsQ0FBQ3ZCLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXlCLFVBQTFCLEVBQXNDLElBQUlTLE1BQUosQ0FBWSxJQUFaLEVBQWtCRSxPQUFsQixDQUF0QztBQUNBO0FBQ0QsS0FKTSxDQUFQO0FBS0EsR0FORDtBQU9BLENBbEVBLEVBa0VHNkIsTUFsRUgsRUFrRVduRSxNQWxFWCxFQWtFbUIwQixRQWxFbkIiLCJmaWxlIjoibWlubnBvc3QtbWVtYmVyc2hpcC1mcm9udC1lbmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyI7KGZ1bmN0aW9uICggd2luZG93ICkge1xuXHRmdW5jdGlvbiBNaW5uUG9zdE1lbWJlcnNoaXAoIGRhdGEsIHNldHRpbmdzICkge1xuXHRcdHRoaXMuZGF0YSA9IHt9O1xuXHRcdGlmICh0eXBlb2YgZGF0YSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRoaXMuZGF0YSA9IGRhdGE7XG5cdFx0fVxuXG5cdFx0dGhpcy5zZXR0aW5ncyA9IHt9O1xuXHRcdGlmICh0eXBlb2Ygc2V0dGluZ3MgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG5cdFx0fVxuXG5cdFx0dGhpcy5wcmV2aW91c0Ftb3VudCA9ICcnO1xuXHRcdGlmICggdHlwZW9mIHRoaXMuZGF0YS5jdXJyZW50X3VzZXIgIT09ICd1bmRlZmluZWQnICYmXG5cdFx0ICAgICB0eXBlb2YgdGhpcy5kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0dGhpcy5wcmV2aW91c0Ftb3VudCA9IHRoaXMuZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50O1xuXHRcdH1cblx0fVxuXG5cdE1pbm5Qb3N0TWVtYmVyc2hpcC5wcm90b3R5cGUgPSB7XG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlICkge1xuXHRcdFx0dmFyIHRoaXN5ZWFyID0gcGFyc2VJbnQoIGFtb3VudCApICogcGFyc2VJbnQoIGZyZXF1ZW5jeSApO1xuXHRcdFx0aWYgKCB0eXBlb2YgdGhpcy5wcmV2aW91c0Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5wcmV2aW91c0Ftb3VudCAhPT0gJycgKSB7XG5cdFx0XHRcdHZhciBwcmlvcl95ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCB0aGlzLnByZXZpb3VzQW1vdW50LnByaW9yX3llYXJfY29udHJpYnV0aW9ucywgMTAgKTtcblx0XHRcdFx0dmFyIGNvbWluZ195ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCB0aGlzLnByZXZpb3VzQW1vdW50LmNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMsIDEwICk7XG5cdFx0XHRcdHZhciBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCA9IHBhcnNlSW50KCB0aGlzLnByZXZpb3VzQW1vdW50LmFubnVhbF9yZWN1cnJpbmdfYW1vdW50LCAxMCApO1xuXHRcdFx0XHQvLyBjYWxjdWxhdGUgbWVtYmVyIGxldmVsIGZvcm11bGFcblx0XHRcdFx0aWYgKCB0eXBlID09PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHByaW9yX3llYXJfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGhpc3llYXIgPSBNYXRoLm1heCggcHJpb3JfeWVhcl9hbW91bnQsIGNvbWluZ195ZWFyX2Ftb3VudCwgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0TGV2ZWwoIHRoaXN5ZWFyICk7XG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGdldExldmVsOiBmdW5jdGlvbiggdGhpc3llYXIgKSB7XG5cdFx0XHR2YXIgbGV2ZWwgPSB7fTtcblx0XHRcdGlmICggdGhpc3llYXIgPiAwICYmIHRoaXN5ZWFyIDwgNjAgKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnQnJvbnplJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHRoaXN5ZWFyID4gNTkgJiYgdGhpc3llYXIgPCAxMjApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdTaWx2ZXInO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAyO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDExOSAmJiB0aGlzeWVhciA8IDI0MCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0dvbGQnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAzO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDIzOSkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1BsYXRpbnVtJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gNDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgZ2V0TGV2ZWxcblx0fTtcblxuXHR3aW5kb3cuTWlublBvc3RNZW1iZXJzaGlwID0gbmV3IE1pbm5Qb3N0TWVtYmVyc2hpcChcblx0XHR3aW5kb3cubWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLFxuXHRcdHdpbmRvdy5taW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzXG5cdCk7XG59KSggd2luZG93ICk7XG4iLCIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50ICkge1xuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RBbW91bnRTZWxlY3QnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHRmcmVxdWVuY3lTZWxlY3RvcjogJy5tLWZyZXF1ZW5jeS1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRhbW91bnRHcm91cDogJy5tLWZyZXF1ZW5jeS1ncm91cCcsXG5cdFx0YW1vdW50U2VsZWN0b3I6ICcubS1hbW91bnQtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0YW1vdW50TGFiZWxzOiAnLm0tYW1vdW50LXNlbGVjdCBsYWJlbCcsXG5cdFx0YW1vdW50VmFsdWU6ICdzdHJvbmcnLFxuXHRcdGFtb3VudERlc2NyaXB0aW9uOiAnLmEtYW1vdW50LWRlc2NyaXB0aW9uJyxcblx0XHRhbW91bnRGaWVsZDogJy5hLWFtb3VudC1maWVsZCAjYW1vdW50J1xuXHR9O1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cdFx0aW5pdDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZnJlcXVlbmNpZXMgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKTtcblx0XHRcdHZhciBhbW91bnRzID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yICk7XG5cdFx0XHR2YXIgYW1vdW50ID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICk7XG5cblx0XHRcdHRoaXMuc2V0QW1vdW50TGFiZWxzKCBmcmVxdWVuY2llcy5maWx0ZXIoJzpjaGVja2VkJykudmFsKCkgKTtcblx0XHRcdGZyZXF1ZW5jaWVzLmNoYW5nZSggdGhpcy5vbkZyZXF1ZW5jeUNoYW5nZS5iaW5kKHRoaXMpICk7XG5cdFx0XHRhbW91bnRzLm9uKCAnY2hhbmdlJywgdGhpcy5jbGVhckFtb3VudEZpZWxkLmJpbmQodGhpcykgKTtcblx0XHRcdGFtb3VudC5vbiggJ2tleXVwIG1vdXNldXAnLCB0aGlzLmNsZWFyQW1vdW50U2VsZWN0b3IuYmluZCh0aGlzKSApO1xuXHRcdH0sXG5cblx0XHRvbkZyZXF1ZW5jeUNoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoICQoIGV2ZW50LnRhcmdldCApLnZhbCgpICk7XG5cdFx0fSxcblxuXHRcdHNldEFtb3VudExhYmVsczogZnVuY3Rpb24oIGZyZXF1ZW5jeVN0cmluZyApIHtcblx0XHRcdHZhciAkZ3JvdXBzID0gJCggdGhpcy5vcHRpb25zLmFtb3VudEdyb3VwICk7XG5cdFx0XHR2YXIgJHNlbGVjdGVkID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yIClcblx0XHRcdCAgICAuZmlsdGVyKCAnOmNoZWNrZWQnICk7XG5cdFx0XHR2YXIgaW5kZXggPSAkc2VsZWN0ZWQuZGF0YSggJ2luZGV4JyApO1xuXG5cdFx0XHQkZ3JvdXBzLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0JGdyb3Vwcy5maWx0ZXIoICdbZGF0YS1mcmVxdWVuY3k9XCInICsgZnJlcXVlbmN5U3RyaW5nICsgJ1wiXScgKVxuXHRcdFx0XHQuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQkc2VsZWN0ZWQucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdFx0JGdyb3Vwcy5maWx0ZXIoICcuYWN0aXZlJyApXG5cdFx0XHRcdC5maW5kKCAnaW5wdXRbdHlwZT1cInJhZGlvXCJdW2RhdGEtaW5kZXg9XCInICsgaW5kZXggKyAnXCJdJyApXG5cdFx0XHRcdC5wcm9wKCAnY2hlY2tlZCcsIHRydWUgKTtcblx0XHR9LCAvLyBlbmQgc2V0QW1vdW50TGFiZWxzXG5cblx0XHRjbGVhckFtb3VudFNlbGVjdG9yOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgYW1vdW50cyA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApO1xuXG5cdFx0XHRpZiAoICQoIGV2ZW50LnRhcmdldCApLnZhbCgpID09PSAnJyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRhbW91bnRzLnJlbW92ZUF0dHIoJ2NoZWNrZWQnKTtcblx0XHR9LFxuXG5cdFx0Y2xlYXJBbW91bnRGaWVsZDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0JCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICkudmFsKCBudWxsICk7XG5cdFx0fSxcblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCApO1xuIiwiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBiZW5lZml0Rm9ybSgpIHtcblx0XHRpZiAoIDIgPT09IHBlcmZvcm1hbmNlLm5hdmlnYXRpb24udHlwZSApIHtcblx0XHRcdGxvY2F0aW9uLnJlbG9hZCggdHJ1ZSApO1xuXHRcdH1cblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24uYS1idXR0b24tZGlzYWJsZWQnICkucmVtb3ZlQXR0ciggJ2Rpc2FibGVkJyApO1xuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHZhciAkYnV0dG9uICA9ICQoIHRoaXMgKTtcblx0XHRcdHZhciAkc3RhdHVzICA9ICQoICcubS1iZW5lZml0LW1lc3NhZ2UnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciAkc2VsZWN0ICA9ICQoICdzZWxlY3QnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciBzZXR0aW5ncyA9IG1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3M7XG5cdFx0XHQvLyByZXNldCB0aGUgbWVzc2FnZSBmb3IgY3VycmVudCBzdGF0dXNcblx0XHRcdGlmICggISAnLm0tYmVuZWZpdC1tZXNzYWdlLXN1Y2Nlc3MnICkge1xuXHRcdFx0XHQkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJyApLnJlbW92ZUNsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSBtLWJlbmVmaXQtbWVzc2FnZS1lcnJvciBtLWJlbmVmaXQtbWVzc2FnZS1pbmZvJyApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gc2V0IGJ1dHRvbiB0byBwcm9jZXNzaW5nXG5cdFx0XHQkYnV0dG9uLnRleHQoICdQcm9jZXNzaW5nJyApLmFkZENsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cblx0XHRcdC8vIGRpc2FibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gc2V0IGFqYXggZGF0YVxuXHRcdFx0dmFyIGRhdGEgPSB7fTtcblx0XHRcdHZhciBiZW5lZml0VHlwZSA9ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJyApLnZhbCgpO1xuXHRcdFx0aWYgKCAncGFydG5lci1vZmZlcnMnID09PSBiZW5lZml0VHlwZSApIHtcblx0XHRcdFx0ZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdiZW5lZml0X2Zvcm1fc3VibWl0Jyxcblx0XHRcdFx0XHQnbWlubnBvc3RfbWVtYmVyc2hpcF9iZW5lZml0X2Zvcm1fbm9uY2UnIDogJGJ1dHRvbi5kYXRhKCAnYmVuZWZpdC1ub25jZScgKSxcblx0XHRcdFx0XHQnY3VycmVudF91cmwnIDogJCggJ2lucHV0W25hbWU9XCJjdXJyZW50X3VybFwiXScpLnZhbCgpLFxuXHRcdFx0XHRcdCdiZW5lZml0LW5hbWUnOiAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScpLnZhbCgpLFxuXHRcdFx0XHRcdCdpbnN0YW5jZV9pZCcgOiAkKCAnW25hbWU9XCJpbnN0YW5jZS1pZC0nICsgJGJ1dHRvbi52YWwoKSArICdcIl0nICkudmFsKCksXG5cdFx0XHRcdFx0J3Bvc3RfaWQnIDogJGJ1dHRvbi52YWwoKSxcblx0XHRcdFx0XHQnaXNfYWpheCcgOiAnMScsXG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JC5wb3N0KCBzZXR0aW5ncy5hamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdFx0Ly8gc3VjY2Vzc1xuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdCRzdGF0dXMuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuYWRkQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3MgKTtcblx0XHRcdFx0XHRcdGlmICggMCA8ICRzZWxlY3QubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0XHQkc2VsZWN0LnByb3AoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkuYXR0ciggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBlcnJvclxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnID09PSB0eXBlb2YgcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdCQoICdvcHRpb24nLCAkc2VsZWN0ICkuZWFjaCggZnVuY3Rpb24oIGkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCAkKCB0aGlzICkudmFsKCkgPT09IHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0JCggdGhpcyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIHJlLWVuYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdFx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXHRcdFx0XHRcdFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXHRcdGlmICggMCA8ICQoICcubS1mb3JtLW1lbWJlcnNoaXAtYmVuZWZpdCcgKS5sZW5ndGggKSB7XG5cdFx0XHRiZW5lZml0Rm9ybSgpO1xuXHRcdH1cblx0fSk7XG5cblx0JCggJy5hLXJlZnJlc2gtcGFnZScgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0bG9jYXRpb24ucmVsb2FkKCk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiKCBmdW5jdGlvbiggJCApIHtcblx0ZnVuY3Rpb24gbXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQoIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApIHtcblx0XHRpZiAoIHR5cGVvZiBnYSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkgeyBcblx0XHQkKCAnLm0tc3VwcG9ydC1jdGEtdG9wIC5hLXN1cHBvcnQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgdmFsdWUgPSAnJztcblx0XHRcdGlmICggJCggJ3N2ZycsICQoIHRoaXMgKSApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdHZhbHVlID0gJCggJ3N2ZycsICQoIHRoaXMgKSApLmF0dHIoICd0aXRsZScgKSArICcgJztcblx0XHRcdH1cblx0XHRcdHZhbHVlID0gdmFsdWUgKyAkKCB0aGlzICkudGV4dCgpO1xuXHRcdFx0bXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQoICdldmVudCcsICdTdXBwb3J0IENUQSAtIEhlYWRlcicsICdDbGljazogJyArIHZhbHVlLCBsb2NhdGlvbi5wYXRobmFtZSApO1xuXHRcdH0pO1xuXHR9KTtcblxufSApKCBqUXVlcnkgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCwgdW5kZWZpbmVkICkge1xuXG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHQnZGVidWcnIDogZmFsc2UsIC8vIHRoaXMgY2FuIGJlIHNldCB0byB0cnVlIG9uIHBhZ2UgbGV2ZWwgb3B0aW9uc1xuXHRcdCdhbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZScgOiAnI2Ftb3VudC1pdGVtICNhbW91bnQnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZScgOiAnLm0tbWVtYmVyc2hpcC1mYXN0LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdCdsZXZlbF92aWV3ZXJfY29udGFpbmVyJyA6ICcuYS1zaG93LWxldmVsJyxcblx0XHQnbGV2ZWxfbmFtZScgOiAnLmEtbGV2ZWwnLFxuXHRcdCd1c2VyX2N1cnJlbnRfbGV2ZWwnIDogJy5hLWN1cnJlbnQtbGV2ZWwnLFxuXHRcdCd1c2VyX25ld19sZXZlbCcgOiAnLmEtbmV3LWxldmVsJyxcblx0XHQnYW1vdW50X3ZpZXdlcicgOiAnLmFtb3VudCBoMycsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hLWZvcm0taXRlbS1tZW1iZXJzaGlwLWZyZXF1ZW5jeScsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHNfdHlwZScgOiAnc2VsZWN0Jyxcblx0XHQnbGV2ZWxzX2NvbnRhaW5lcicgOiAnLm8tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWxzJyxcblx0XHQnc2luZ2xlX2xldmVsX2NvbnRhaW5lcicgOiAnLm0tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWwnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcicgOiAnLm0tbWVtYmVyLWxldmVsLWJyaWVmJyxcblx0XHQnZmxpcHBlZF9pdGVtcycgOiAnZGl2LmFtb3VudCwgZGl2LmVudGVyJyxcblx0XHQnbGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3InIDogJy5zaG93LWZyZXF1ZW5jeScsXG5cdFx0J2Nob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYW1vdW50IC5hLWJ1dHRvbi1mbGlwJyxcblx0XHQnYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmVudGVyIGlucHV0LmFtb3VudC1lbnRyeScsXG5cdH07IC8vIGVuZCBkZWZhdWx0c1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblxuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblxuXHRcdGluaXQ6IGZ1bmN0aW9uKCByZXNldCwgYW1vdW50ICkge1xuXHRcdFx0Ly8gUGxhY2UgaW5pdGlhbGl6YXRpb24gbG9naWMgaGVyZVxuXHRcdFx0Ly8gWW91IGFscmVhZHkgaGF2ZSBhY2Nlc3MgdG8gdGhlIERPTSBlbGVtZW50IGFuZFxuXHRcdFx0Ly8gdGhlIG9wdGlvbnMgdmlhIHRoZSBpbnN0YW5jZSwgZS5nLiB0aGlzLmVsZW1lbnRcblx0XHRcdC8vIGFuZCB0aGlzLm9wdGlvbnNcblx0XHRcdC8vIHlvdSBjYW4gYWRkIG1vcmUgZnVuY3Rpb25zIGxpa2UgdGhlIG9uZSBiZWxvdyBhbmRcblx0XHRcdC8vIGNhbGwgdGhlbSBsaWtlIHNvOiB0aGlzLnlvdXJPdGhlckZ1bmN0aW9uKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKS5cblx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQgPSAnJztcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgJiYgJCggdGhpcy5vcHRpb25zLnVzZXJfY3VycmVudF9sZXZlbCApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudDtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5jYXRjaEhhc2hMaW5rcyggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5sZXZlbFZpZXdlcigpO1xuXHRcdFx0dGhpcy5sZXZlbEZsaXBwZXIoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN0YXJ0TGV2ZWxDbGljayggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHR9LFxuXG5cdFx0Y2F0Y2hIYXNoTGlua3M6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnYVtocmVmKj1cIiNcIl06bm90KFtocmVmPVwiI1wiXSknLCBlbGVtZW50KS5jbGljayhmdW5jdGlvbihlKSB7XG5cdFx0XHRcdHZhciB0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblx0XHRcdFx0aWYgKHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiYgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpID09IHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpICYmIGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWUpIHtcblx0XHRcdFx0XHR2YXIgdGFyZ2V0ID0gJCh0aGlzLmhhc2gpO1xuXHRcdFx0XHRcdHRhcmdldCA9IHRhcmdldC5sZW5ndGggPyB0YXJnZXQgOiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsnXScpO1xuXHRcdFx0XHRcdGlmICh0YXJnZXQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQkKCdodG1sLGJvZHknKS5hbmltYXRlKHtcblx0XHRcdFx0XHRcdFx0c2Nyb2xsVG9wOiB0YXJnZXQub2Zmc2V0KCkudG9wXG5cdFx0XHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbFZpZXdlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgJGFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRfc2VsZWN0b3Jfc3RhbmRhbG9uZSApO1xuXHRcdFx0dmFyICRmcmVxdWVuY3kgPSAkKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX3N0YW5kYWxvbmUgKTtcblx0XHRcdGlmICggISggJGFtb3VudC5sZW5ndGggPiAwICYmICRmcmVxdWVuY3kubGVuZ3RoID4gMCApICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCgpO1xuXHRcdFx0JGZyZXF1ZW5jeS5vbignY2hhbmdlJywgdGhpcy5jaGVja0FuZFNldExldmVsLmJpbmQoIHRoaXMgKSApO1xuXHRcdFx0JGFtb3VudC5iaW5kKCdrZXl1cCBtb3VzZXVwJywgdGhpcy5vbkFtb3VudENoYW5nZS5iaW5kKCB0aGlzICkgKTtcblx0XHR9LCAvLyBlbmQgbGV2ZWxWaWV3ZXJcblxuXHRcdG9uQW1vdW50Q2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgJHRhcmdldCA9ICQoIGV2ZW50LnRhcmdldCApO1xuXHRcdFx0aWYgKCAkdGFyZ2V0LmRhdGEoICdsYXN0LXZhbHVlJyApICE9ICR0YXJnZXQudmFsKCkgKSB7XG5cdFx0XHRcdCR0YXJnZXQuZGF0YSggJ2xhc3QtdmFsdWUnLCAkdGFyZ2V0LnZhbCgpICk7XG5cdFx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCgpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBvbkFtb3VudENoYW5nZVxuXG5cdFx0Y2hlY2tBbmRTZXRMZXZlbDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgYW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9zdGFuZGFsb25lICkudmFsKCk7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3Jfc3RhbmRhbG9uZSArICc6Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdHZhciBmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHR2YXIgbGV2ZWwgPSB0aGlzLmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuc2hvd05ld0xldmVsKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucywgbGV2ZWwgKTtcblx0XHR9LCAvLyBlbmQgY2hlY2tBbmRTZXRMZXZlbFxuXG5cdFx0bGV2ZWxGbGlwcGVyOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBwcmV2aW91c19hbW91bnQgPSB0aGlzLnByZXZpb3VzQW1vdW50O1xuXHRcdFx0dmFyIGFtb3VudCA9IDA7XG5cdFx0XHR2YXIgbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSAwO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3kgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9ICcnO1xuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxzX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQgKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuZmxpcHBlZF9pdGVtcywgJCh0aGlzKSApLndyYXBBbGwoICc8ZGl2IGNsYXNzPVwiZmxpcHBlclwiLz4nICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCh0aGlzKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0XHRpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBmcmVxdWVuY3kgPT0gMSApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQteWVhcmx5JyApICk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3kgPT0gMTIgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LW1vbnRobHknICkgKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXG5cdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHR0aGF0LmNoYW5nZUZyZXF1ZW5jeSggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJCggb3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IsIGVsZW1lbnQpLnRleHQoZnJlcXVlbmN5X25hbWUpO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkudmFsKCk7XG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGF0LmNoYW5nZUFtb3VudFByZXZpZXcoIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKS5wYXJlbnQoKSApLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGxldmVsRmxpcHBlclxuXG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlICk7XG5cblx0XHRcdCQoJ2gyJywgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWxbJ25hbWUnXSApIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQodGhpcykucGFyZW50KCkucGFyZW50KCkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRzaG93TmV3TGV2ZWw6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApIHtcblx0XHRcdHZhciBtZW1iZXJfbGV2ZWxfcHJlZml4ID0gJyc7XG5cdFx0XHR2YXIgb2xkX2xldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciA9IG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcjsgLy8gdGhpcyBzaG91bGQgY2hhbmdlIHdoZW4gd2UgcmVwbGFjZSB0aGUgdGV4dCwgaWYgdGhlcmUgaXMgYSBsaW5rIGluc2lkZSBpdFxuXHRcdFx0dmFyIGRlY29kZUh0bWxFbnRpdHkgPSBmdW5jdGlvbiggc3RyICkge1xuXHRcdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoIC8mIyhcXGQrKTsvZywgZnVuY3Rpb24oIG1hdGNoLCBkZWMgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoIGRlYyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRtZW1iZXJfbGV2ZWxfcHJlZml4ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLm1lbWJlcl9sZXZlbF9wcmVmaXg7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcikucHJvcCggJ2NsYXNzJywgJ2Etc2hvdy1sZXZlbCBhLXNob3ctbGV2ZWwtJyArIGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApO1xuXG5cdFx0XHRcdGlmICggJCggb3B0aW9ucy51c2VyX2N1cnJlbnRfbGV2ZWwgKS5sZW5ndGggPiAwICYmIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0XHRpZiAoICdhJywgJCggb3B0aW9ucy5sZXZlbF92aWV3ZXJfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdGxldmVsX3ZpZXdlcl9jb250YWluZXJfc2VsZWN0b3IgPSBvcHRpb25zLmxldmVsX3ZpZXdlcl9jb250YWluZXIgKyAnIGEnO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG9sZF9sZXZlbCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLnJlcGxhY2UoIG1lbWJlcl9sZXZlbF9wcmVmaXgsICcnICk7XG5cblx0XHRcdFx0XHRpZiAoIG9sZF9sZXZlbCAhPT0gbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICkge1xuXHRcdFx0XHRcdFx0JCggbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmRhdGEoICdjaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggbGV2ZWxfdmlld2VyX2NvbnRhaW5lcl9zZWxlY3RvciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lciApLmRhdGEoICdub3QtY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0JChvcHRpb25zLmxldmVsX25hbWUsIG9wdGlvbnMubGV2ZWxfdmlld2VyX2NvbnRhaW5lcikudGV4dCggbGV2ZWxbJ25hbWUnXSApO1xuXHRcdFx0fVxuXG5cdFx0fSwgLy8gZW5kIHNob3dOZXdMZXZlbFxuXG5cdFx0Y2hhbmdlRnJlcXVlbmN5OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHRcdHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdFx0dmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHR2YXIgZnJlcXVlbmN5ICAgICAgPSBwYXJzZUludCggc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzFdICk7XG5cblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkudmFsKCBzZWxlY3RlZCApO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5wcm9wKCAnc2VsZWN0ZWQnLCBzZWxlY3RlZCApO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLmRhdGEoICdmcmVxdWVuY3knLCBmcmVxdWVuY3kgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VGcmVxdWVuY3lcblxuXHRcdGNoYW5nZUFtb3VudFByZXZpZXc6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdFx0dmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0XHR2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VBbW91bnRQcmV2aWV3XG5cblx0XHRzdGFydExldmVsQ2xpY2s6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnLnN0YXJ0LWxldmVsJykuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBsZXZlbF9jbGFzcyA9ICQoIHRoaXMgKS5wcm9wKCAnY2xhc3MnICk7XG5cdFx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSBsZXZlbF9jbGFzc1tsZXZlbF9jbGFzcy5sZW5ndGggLTFdO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciwgZWxlbWVudCApLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKyAnICcgKyBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIHN0YXJ0TGV2ZWxDbGlja1xuXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG5cbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCApO1xuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCApIHtcblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0VHJhY2tTdWJtaXQnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHR0eXBlOiAnZXZlbnQnLFxuXHRcdGNhdGVnb3J5OiAnU3VwcG9ydCBVcycsXG5cdFx0YWN0aW9uOiAnQmVjb21lIEEgTWVtYmVyJyxcblx0XHRsYWJlbDogbG9jYXRpb24ucGF0aG5hbWVcblx0fTtcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXHRcdGluaXQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zO1xuXG5cdFx0XHQkKCB0aGlzLmVsZW1lbnQgKS5zdWJtaXQoIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0dGhhdC5hbmFseXRpY3NFdmVudFRyYWNrKFxuXHRcdFx0XHRcdG9wdGlvbnMudHlwZSxcblx0XHRcdFx0XHRvcHRpb25zLmNhdGVnb3J5LFxuXHRcdFx0XHRcdG9wdGlvbnMuYWN0aW9uLFxuXHRcdFx0XHRcdG9wdGlvbnMubGFiZWxcblx0XHRcdFx0KTtcblx0XHRcdFx0Ly8gYWxzbyBidWJibGVzIHRoZSBldmVudCB1cCB0byBzdWJtaXQgdGhlIGZvcm1cblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRhbmFseXRpY3NFdmVudFRyYWNrOiBmdW5jdGlvbiggdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgZ2EgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmICggdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwgKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKTtcblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzRXZlbnRUcmFja1xuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50ICk7XG4iXX0=
