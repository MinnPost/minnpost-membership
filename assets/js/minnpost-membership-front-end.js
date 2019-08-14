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

(function ($, window, document, MinnPostMembership) {
  // Create the defaults once
  var pluginName = 'minnpostAmountSelect',
      defaults = {
    frequencySelector: '.m-frequency-select input[type="radio"]',
    amountGroup: '.m-frequency-group',
    amountSelector: '.m-amount-select input[type="radio"]',
    amountLabels: '.m-amount-select label',
    amountValue: 'strong',
    amountDescription: '.a-amount-description',
    amountField: '.a-amount-field #amount',
    levelViewer: '.a-show-level',
    levelName: '.a-level',
    userCurrentLevel: '.a-current-level'
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
      var $frequency = $(this.element).find(this.options.frequencySelector);
      var $suggestedAmount = $(this.options.amountSelector);
      var $amount = $(this.element).find(this.options.amountField);

      if (!($amount.length > 0 && $frequency.length > 0 && $suggestedAmount.length > 0)) {
        return;
      }

      this.setAmountLabels($frequency.filter(':checked').val());
      this.checkAndSetLevel();
      $frequency.on('change', this.onFrequencyChange.bind(this));
      $suggestedAmount.on('change', this.onSuggestedAmountChange.bind(this));
      $amount.on('keyup mouseup', this.onAmountChange.bind(this));
    },
    onFrequencyChange: function onFrequencyChange(event) {
      this.setAmountLabels($(event.target).val());
      this.checkAndSetLevel();
    },
    onSuggestedAmountChange: function onSuggestedAmountChange(event) {
      $(this.element).find(this.options.amountField).val(null);
      this.checkAndSetLevel();
    },
    onAmountChange: function onAmountChange(event) {
      this.clearAmountSelector(event);
      var $target = $(event.target);

      if ($target.data('last-value') != $target.val()) {
        $target.data('last-value', $target.val());
        this.checkAndSetLevel();
      }
    },
    // end onAmountChange
    clearAmountSelector: function clearAmountSelector(event) {
      var $suggestedAmount = $(this.options.amountSelector);

      if ($(event.target).val() === '') {
        return;
      }

      $suggestedAmount.removeAttr('checked');
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
    checkAndSetLevel: function checkAndSetLevel() {
      var amount = $(this.options.amountSelector).filter(':checked').val();

      if (typeof amount === 'undefined') {
        amount = $(this.options.amountField).val();
      }

      var frequency_string = $(this.options.frequencySelector + ':checked').val();
      var frequency = frequency_string.split(' - ')[1];
      var frequency_name = frequency_string.split(' - ')[0];
      var level = MinnPostMembership.checkLevel(amount, frequency, frequency_name);
      this.showNewLevel(this.element, this.options, level);
    },
    // end checkAndSetLevel
    showNewLevel: function showNewLevel(element, options, level) {
      var member_level_prefix = '';
      var old_level = '';
      var levelViewerContainer = options.levelViewer; // this should change when we replace the text, if there is a link inside it

      var decodeHtmlEntity = function decodeHtmlEntity(str) {
        return str.replace(/&#(\d+);/g, function (match, dec) {
          return String.fromCharCode(dec);
        });
      };

      if (typeof minnpost_membership_data !== 'undefined') {
        member_level_prefix = minnpost_membership_data.member_level_prefix;
      }

      if ($(options.levelViewer).length > 0) {
        $(options.levelViewer).prop('class', 'a-show-level a-show-level-' + level['name'].toLowerCase());

        if ($(options.userCurrentLevel).length > 0 && minnpost_membership_data.current_user.member_level.length > 0) {
          if ('a', $(options.levelViewer).length > 0) {
            levelViewerContainer = options.levelViewer + ' a';
          }

          old_level = minnpost_membership_data.current_user.member_level.replace(member_level_prefix, '');

          if (old_level !== level['name'].toLowerCase()) {
            $(levelViewerContainer).html(decodeHtmlEntity($(options.levelViewer).data('changed')));
          } else {
            $(levelViewerContainer).html(decodeHtmlEntity($(options.levelViewer).data('not-changed')));
          }
        }

        $(options.levelName, options.levelViewer).text(level['name']);
      }
    } // end showNewLevel

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIiwidHJhY2stc3VibWl0LmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsIm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCIkIiwiZG9jdW1lbnQiLCJwbHVnaW5OYW1lIiwiZGVmYXVsdHMiLCJmcmVxdWVuY3lTZWxlY3RvciIsImFtb3VudEdyb3VwIiwiYW1vdW50U2VsZWN0b3IiLCJhbW91bnRMYWJlbHMiLCJhbW91bnRWYWx1ZSIsImFtb3VudERlc2NyaXB0aW9uIiwiYW1vdW50RmllbGQiLCJsZXZlbFZpZXdlciIsImxldmVsTmFtZSIsInVzZXJDdXJyZW50TGV2ZWwiLCJQbHVnaW4iLCJlbGVtZW50Iiwib3B0aW9ucyIsImV4dGVuZCIsIl9kZWZhdWx0cyIsIl9uYW1lIiwiaW5pdCIsIiRmcmVxdWVuY3kiLCJmaW5kIiwiJHN1Z2dlc3RlZEFtb3VudCIsIiRhbW91bnQiLCJsZW5ndGgiLCJzZXRBbW91bnRMYWJlbHMiLCJmaWx0ZXIiLCJ2YWwiLCJjaGVja0FuZFNldExldmVsIiwib24iLCJvbkZyZXF1ZW5jeUNoYW5nZSIsImJpbmQiLCJvblN1Z2dlc3RlZEFtb3VudENoYW5nZSIsIm9uQW1vdW50Q2hhbmdlIiwiZXZlbnQiLCJ0YXJnZXQiLCJjbGVhckFtb3VudFNlbGVjdG9yIiwiJHRhcmdldCIsInJlbW92ZUF0dHIiLCJmcmVxdWVuY3lTdHJpbmciLCIkZ3JvdXBzIiwiJHNlbGVjdGVkIiwiaW5kZXgiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwicHJvcCIsImZyZXF1ZW5jeV9zdHJpbmciLCJzcGxpdCIsImZyZXF1ZW5jeV9uYW1lIiwic2hvd05ld0xldmVsIiwibWVtYmVyX2xldmVsX3ByZWZpeCIsIm9sZF9sZXZlbCIsImxldmVsVmlld2VyQ29udGFpbmVyIiwiZGVjb2RlSHRtbEVudGl0eSIsInN0ciIsInJlcGxhY2UiLCJtYXRjaCIsImRlYyIsIlN0cmluZyIsImZyb21DaGFyQ29kZSIsInRvTG93ZXJDYXNlIiwibWVtYmVyX2xldmVsIiwiaHRtbCIsInRleHQiLCJmbiIsImVhY2giLCJqUXVlcnkiLCJiZW5lZml0Rm9ybSIsInBlcmZvcm1hbmNlIiwibmF2aWdhdGlvbiIsImxvY2F0aW9uIiwicmVsb2FkIiwiY2xpY2siLCJwcmV2ZW50RGVmYXVsdCIsIiRidXR0b24iLCIkc3RhdHVzIiwicGFyZW50IiwiJHNlbGVjdCIsImJlbmVmaXRUeXBlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJidXR0b25fdmFsdWUiLCJidXR0b25fbGFiZWwiLCJidXR0b25fY2xhc3MiLCJidXR0b25fYXR0ciIsIm1lc3NhZ2UiLCJtZXNzYWdlX2NsYXNzIiwibm90IiwiYXR0ciIsInJlbW92ZV9pbnN0YW5jZV92YWx1ZSIsInNob3ciLCJoaWRlIiwiaSIsInJlbW92ZSIsInJlYWR5IiwibXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQiLCJjYXRlZ29yeSIsImFjdGlvbiIsImxhYmVsIiwidmFsdWUiLCJnYSIsInBhdGhuYW1lIiwidW5kZWZpbmVkIiwicmVzZXQiLCJjYXRjaEhhc2hMaW5rcyIsImxldmVsRmxpcHBlciIsInN0YXJ0TGV2ZWxDbGljayIsImUiLCJob3N0bmFtZSIsImhhc2giLCJzbGljZSIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwibGV2ZWxfbnVtYmVyIiwibGV2ZWxzX2NvbnRhaW5lciIsInNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yIiwiZmxpcHBlZF9pdGVtcyIsIndyYXBBbGwiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsImNsb3Nlc3QiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwiY2hhbmdlQW1vdW50UHJldmlldyIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyIsInN1Ym1pdCIsImFuYWx5dGljc0V2ZW50VHJhY2siXSwibWFwcGluZ3MiOiI7O0FBQUE7O0FBQUMsQ0FBQyxVQUFXQSxNQUFYLEVBQW9CO0FBQ3JCLFdBQVNDLGtCQUFULENBQTZCQyxJQUE3QixFQUFtQ0MsUUFBbkMsRUFBOEM7QUFDN0MsU0FBS0QsSUFBTCxHQUFZLEVBQVo7O0FBQ0EsUUFBSSxPQUFPQSxJQUFQLEtBQWdCLFdBQXBCLEVBQWlDO0FBQ2hDLFdBQUtBLElBQUwsR0FBWUEsSUFBWjtBQUNBOztBQUVELFNBQUtDLFFBQUwsR0FBZ0IsRUFBaEI7O0FBQ0EsUUFBSSxPQUFPQSxRQUFQLEtBQW9CLFdBQXhCLEVBQXFDO0FBQ3BDLFdBQUtBLFFBQUwsR0FBZ0JBLFFBQWhCO0FBQ0E7O0FBRUQsU0FBS0MsY0FBTCxHQUFzQixFQUF0Qjs7QUFDQSxRQUFLLE9BQU8sS0FB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a0QsSUFBTCxDQUFVLFlBQVk7QUFDNUIsVUFBSyxDQUFFbEUsQ0FBQyxDQUFDdkIsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZeUIsVUFBMUIsQ0FBUCxFQUFnRDtBQUMvQ0YsUUFBQUEsQ0FBQyxDQUFDdkIsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZeUIsVUFBMUIsRUFBc0MsSUFBSVksTUFBSixDQUFZLElBQVosRUFBa0JFLE9BQWxCLENBQXRDO0FBQ0E7QUFDRCxLQUpNLENBQVA7QUFLQSxHQU5EO0FBT0EsQ0FsRUEsRUFrRUdtRCxNQWxFSCxFQWtFVzVGLE1BbEVYLEVBa0VtQjBCLFFBbEVuQiIsImZpbGUiOiJtaW5ucG9zdC1tZW1iZXJzaGlwLWZyb250LWVuZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIjsoZnVuY3Rpb24gKCB3aW5kb3cgKSB7XG5cdGZ1bmN0aW9uIE1pbm5Qb3N0TWVtYmVyc2hpcCggZGF0YSwgc2V0dGluZ3MgKSB7XG5cdFx0dGhpcy5kYXRhID0ge307XG5cdFx0aWYgKHR5cGVvZiBkYXRhICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5kYXRhID0gZGF0YTtcblx0XHR9XG5cblx0XHR0aGlzLnNldHRpbmdzID0ge307XG5cdFx0aWYgKHR5cGVvZiBzZXR0aW5ncyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcblx0XHR9XG5cblx0XHR0aGlzLnByZXZpb3VzQW1vdW50ID0gJyc7XG5cdFx0aWYgKCB0eXBlb2YgdGhpcy5kYXRhLmN1cnJlbnRfdXNlciAhPT0gJ3VuZGVmaW5lZCcgJiZcblx0XHQgICAgIHR5cGVvZiB0aGlzLmRhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHR0aGlzLnByZXZpb3VzQW1vdW50ID0gdGhpcy5kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQ7XG5cdFx0fVxuXHR9XG5cblx0TWlublBvc3RNZW1iZXJzaGlwLnByb3RvdHlwZSA9IHtcblx0XHRjaGVja0xldmVsOiBmdW5jdGlvbiggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUgKSB7XG5cdFx0XHR2YXIgdGhpc3llYXIgPSBwYXJzZUludCggYW1vdW50ICkgKiBwYXJzZUludCggZnJlcXVlbmN5ICk7XG5cdFx0XHRpZiAoIHR5cGVvZiB0aGlzLnByZXZpb3VzQW1vdW50ICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLnByZXZpb3VzQW1vdW50ICE9PSAnJyApIHtcblx0XHRcdFx0dmFyIHByaW9yX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHRoaXMucHJldmlvdXNBbW91bnQucHJpb3JfeWVhcl9jb250cmlidXRpb25zLCAxMCApO1xuXHRcdFx0XHR2YXIgY29taW5nX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHRoaXMucHJldmlvdXNBbW91bnQuY29taW5nX3llYXJfY29udHJpYnV0aW9ucywgMTAgKTtcblx0XHRcdFx0dmFyIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ID0gcGFyc2VJbnQoIHRoaXMucHJldmlvdXNBbW91bnQuYW5udWFsX3JlY3VycmluZ19hbW91bnQsIDEwICk7XG5cdFx0XHRcdC8vIGNhbGN1bGF0ZSBtZW1iZXIgbGV2ZWwgZm9ybXVsYVxuXHRcdFx0XHRpZiAoIHR5cGUgPT09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cHJpb3JfeWVhcl9hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0YW5udWFsX3JlY3VycmluZ19hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGlzeWVhciA9IE1hdGgubWF4KCBwcmlvcl95ZWFyX2Ftb3VudCwgY29taW5nX3llYXJfYW1vdW50LCBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRMZXZlbCggdGhpc3llYXIgKTtcblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Z2V0TGV2ZWw6IGZ1bmN0aW9uKCB0aGlzeWVhciApIHtcblx0XHRcdHZhciBsZXZlbCA9IHt9O1xuXHRcdFx0aWYgKCB0aGlzeWVhciA+IDAgJiYgdGhpc3llYXIgPCA2MCApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdCcm9uemUnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAxO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodGhpc3llYXIgPiA1OSAmJiB0aGlzeWVhciA8IDEyMCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1NpbHZlcic7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDI7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMTE5ICYmIHRoaXN5ZWFyIDwgMjQwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnR29sZCc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDM7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMjM5KSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnUGxhdGludW0nO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSA0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBnZXRMZXZlbFxuXHR9O1xuXG5cdHdpbmRvdy5NaW5uUG9zdE1lbWJlcnNoaXAgPSBuZXcgTWlublBvc3RNZW1iZXJzaGlwKFxuXHRcdHdpbmRvdy5taW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEsXG5cdFx0d2luZG93Lm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3Ncblx0KTtcbn0pKCB3aW5kb3cgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCApIHtcblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0QW1vdW50U2VsZWN0Jyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0ZnJlcXVlbmN5U2VsZWN0b3I6ICcubS1mcmVxdWVuY3ktc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0YW1vdW50R3JvdXA6ICcubS1mcmVxdWVuY3ktZ3JvdXAnLFxuXHRcdGFtb3VudFNlbGVjdG9yOiAnLm0tYW1vdW50LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGFtb3VudExhYmVsczogJy5tLWFtb3VudC1zZWxlY3QgbGFiZWwnLFxuXHRcdGFtb3VudFZhbHVlOiAnc3Ryb25nJyxcblx0XHRhbW91bnREZXNjcmlwdGlvbjogJy5hLWFtb3VudC1kZXNjcmlwdGlvbicsXG5cdFx0YW1vdW50RmllbGQ6ICcuYS1hbW91bnQtZmllbGQgI2Ftb3VudCcsXG5cdFx0bGV2ZWxWaWV3ZXI6ICcuYS1zaG93LWxldmVsJyxcblx0XHRsZXZlbE5hbWU6ICcuYS1sZXZlbCcsXG5cdFx0dXNlckN1cnJlbnRMZXZlbDogJy5hLWN1cnJlbnQtbGV2ZWwnXG5cdH07XG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblx0XHRpbml0OiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciAkZnJlcXVlbmN5ID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICk7XG5cdFx0XHR2YXIgJHN1Z2dlc3RlZEFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApO1xuXHRcdFx0dmFyICRhbW91bnQgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQgKTtcblx0XHRcdGlmICggISggJGFtb3VudC5sZW5ndGggPiAwICYmXG5cdFx0XHQgICAgICAgICRmcmVxdWVuY3kubGVuZ3RoID4gMCAmJlxuXHRcdFx0ICAgICAgICAkc3VnZ2VzdGVkQW1vdW50Lmxlbmd0aCA+IDAgKSApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnNldEFtb3VudExhYmVscyggJGZyZXF1ZW5jeS5maWx0ZXIoJzpjaGVja2VkJykudmFsKCkgKTtcblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCgpO1xuXG5cdFx0XHQkZnJlcXVlbmN5Lm9uKCAnY2hhbmdlJywgdGhpcy5vbkZyZXF1ZW5jeUNoYW5nZS5iaW5kKHRoaXMpICk7XG5cdFx0XHQkc3VnZ2VzdGVkQW1vdW50Lm9uKCAnY2hhbmdlJywgdGhpcy5vblN1Z2dlc3RlZEFtb3VudENoYW5nZS5iaW5kKHRoaXMpICk7XG5cdFx0XHQkYW1vdW50Lm9uKCAna2V5dXAgbW91c2V1cCcsIHRoaXMub25BbW91bnRDaGFuZ2UuYmluZCh0aGlzKSApO1xuXHRcdH0sXG5cblx0XHRvbkZyZXF1ZW5jeUNoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoICQoIGV2ZW50LnRhcmdldCApLnZhbCgpICk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoKTtcblx0XHR9LFxuXG5cdFx0b25TdWdnZXN0ZWRBbW91bnRDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdCQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCApLnZhbCggbnVsbCApO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCk7XG5cdFx0fSxcblxuXHRcdG9uQW1vdW50Q2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR0aGlzLmNsZWFyQW1vdW50U2VsZWN0b3IoIGV2ZW50ICk7XG5cblx0XHRcdHZhciAkdGFyZ2V0ID0gJCggZXZlbnQudGFyZ2V0ICk7XG5cdFx0XHRpZiAoICR0YXJnZXQuZGF0YSggJ2xhc3QtdmFsdWUnICkgIT0gJHRhcmdldC52YWwoKSApIHtcblx0XHRcdFx0JHRhcmdldC5kYXRhKCAnbGFzdC12YWx1ZScsICR0YXJnZXQudmFsKCkgKTtcblx0XHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIG9uQW1vdW50Q2hhbmdlXG5cblx0XHRjbGVhckFtb3VudFNlbGVjdG9yOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgJHN1Z2dlc3RlZEFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApO1xuXG5cdFx0XHRpZiAoICQoIGV2ZW50LnRhcmdldCApLnZhbCgpID09PSAnJyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQkc3VnZ2VzdGVkQW1vdW50LnJlbW92ZUF0dHIoJ2NoZWNrZWQnKTtcblx0XHR9LFxuXG5cdFx0c2V0QW1vdW50TGFiZWxzOiBmdW5jdGlvbiggZnJlcXVlbmN5U3RyaW5nICkge1xuXHRcdFx0dmFyICRncm91cHMgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50R3JvdXAgKTtcblx0XHRcdHZhciAkc2VsZWN0ZWQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKVxuXHRcdFx0ICAgIC5maWx0ZXIoICc6Y2hlY2tlZCcgKTtcblx0XHRcdHZhciBpbmRleCA9ICRzZWxlY3RlZC5kYXRhKCAnaW5kZXgnICk7XG5cblx0XHRcdCRncm91cHMucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQkZ3JvdXBzLmZpbHRlciggJ1tkYXRhLWZyZXF1ZW5jeT1cIicgKyBmcmVxdWVuY3lTdHJpbmcgKyAnXCJdJyApXG5cdFx0XHRcdC5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCRzZWxlY3RlZC5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0XHQkZ3JvdXBzLmZpbHRlciggJy5hY3RpdmUnIClcblx0XHRcdFx0LmZpbmQoICdpbnB1dFt0eXBlPVwicmFkaW9cIl1bZGF0YS1pbmRleD1cIicgKyBpbmRleCArICdcIl0nIClcblx0XHRcdFx0LnByb3AoICdjaGVja2VkJywgdHJ1ZSApO1xuXHRcdH0sIC8vIGVuZCBzZXRBbW91bnRMYWJlbHNcblxuXHRcdGNoZWNrQW5kU2V0TGV2ZWw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApLmZpbHRlciggJzpjaGVja2VkJyApLnZhbCgpO1xuXHRcdFx0aWYgKCB0eXBlb2YgYW1vdW50ID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0YW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICkudmFsKCk7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBmcmVxdWVuY3lfc3RyaW5nID0gJCggdGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICsgJzpjaGVja2VkJyApLnZhbCgpO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdHZhciBsZXZlbCA9IE1pbm5Qb3N0TWVtYmVyc2hpcC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUgKTtcblx0XHRcdHRoaXMuc2hvd05ld0xldmVsKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucywgbGV2ZWwgKTtcblx0XHR9LCAvLyBlbmQgY2hlY2tBbmRTZXRMZXZlbFxuXG5cdFx0c2hvd05ld0xldmVsOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKSB7XG5cdFx0XHR2YXIgbWVtYmVyX2xldmVsX3ByZWZpeCA9ICcnO1xuXHRcdFx0dmFyIG9sZF9sZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsVmlld2VyQ29udGFpbmVyID0gb3B0aW9ucy5sZXZlbFZpZXdlcjsgLy8gdGhpcyBzaG91bGQgY2hhbmdlIHdoZW4gd2UgcmVwbGFjZSB0aGUgdGV4dCwgaWYgdGhlcmUgaXMgYSBsaW5rIGluc2lkZSBpdFxuXHRcdFx0dmFyIGRlY29kZUh0bWxFbnRpdHkgPSBmdW5jdGlvbiggc3RyICkge1xuXHRcdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoIC8mIyhcXGQrKTsvZywgZnVuY3Rpb24oIG1hdGNoLCBkZWMgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoIGRlYyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRtZW1iZXJfbGV2ZWxfcHJlZml4ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLm1lbWJlcl9sZXZlbF9wcmVmaXg7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0JChvcHRpb25zLmxldmVsVmlld2VyKS5wcm9wKCAnY2xhc3MnLCAnYS1zaG93LWxldmVsIGEtc2hvdy1sZXZlbC0nICsgbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICk7XG5cblx0XHRcdFx0aWYgKCAkKCBvcHRpb25zLnVzZXJDdXJyZW50TGV2ZWwgKS5sZW5ndGggPiAwICYmIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0XHRpZiAoICdhJywgJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHRsZXZlbFZpZXdlckNvbnRhaW5lciA9IG9wdGlvbnMubGV2ZWxWaWV3ZXIgKyAnIGEnO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG9sZF9sZXZlbCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLnJlcGxhY2UoIG1lbWJlcl9sZXZlbF9wcmVmaXgsICcnICk7XG5cblx0XHRcdFx0XHRpZiAoIG9sZF9sZXZlbCAhPT0gbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICkge1xuXHRcdFx0XHRcdFx0JCggbGV2ZWxWaWV3ZXJDb250YWluZXIgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsVmlld2VyICkuZGF0YSggJ2NoYW5nZWQnICkgKSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCBsZXZlbFZpZXdlckNvbnRhaW5lciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5kYXRhKCAnbm90LWNoYW5nZWQnICkgKSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbE5hbWUsIG9wdGlvbnMubGV2ZWxWaWV3ZXIpLnRleHQoIGxldmVsWyduYW1lJ10gKTtcblx0XHRcdH1cblxuXHRcdH0sIC8vIGVuZCBzaG93TmV3TGV2ZWxcblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwICk7XG4iLCIoIGZ1bmN0aW9uKCAkICkge1xuXG5cdGZ1bmN0aW9uIGJlbmVmaXRGb3JtKCkge1xuXHRcdGlmICggMiA9PT0gcGVyZm9ybWFuY2UubmF2aWdhdGlvbi50eXBlICkge1xuXHRcdFx0bG9jYXRpb24ucmVsb2FkKCB0cnVlICk7XG5cdFx0fVxuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbi5hLWJ1dHRvbi1kaXNhYmxlZCcgKS5yZW1vdmVBdHRyKCAnZGlzYWJsZWQnICk7XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0dmFyICRidXR0b24gID0gJCggdGhpcyApO1xuXHRcdFx0dmFyICRzdGF0dXMgID0gJCggJy5tLWJlbmVmaXQtbWVzc2FnZScsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyICRzZWxlY3QgID0gJCggJ3NlbGVjdCcsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyIHNldHRpbmdzID0gbWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncztcblx0XHRcdC8vIHJlc2V0IHRoZSBtZXNzYWdlIGZvciBjdXJyZW50IHN0YXR1c1xuXHRcdFx0aWYgKCAhICcubS1iZW5lZml0LW1lc3NhZ2Utc3VjY2VzcycgKSB7XG5cdFx0XHRcdCQoICcubS1iZW5lZml0LW1lc3NhZ2UnICkucmVtb3ZlQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlIG0tYmVuZWZpdC1tZXNzYWdlLWVycm9yIG0tYmVuZWZpdC1tZXNzYWdlLWluZm8nICk7XG5cdFx0XHR9XG5cdFx0XHQvLyBzZXQgYnV0dG9uIHRvIHByb2Nlc3Npbmdcblx0XHRcdCRidXR0b24udGV4dCggJ1Byb2Nlc3NpbmcnICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gZGlzYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXG5cdFx0XHQvLyBzZXQgYWpheCBkYXRhXG5cdFx0XHR2YXIgZGF0YSA9IHt9O1xuXHRcdFx0dmFyIGJlbmVmaXRUeXBlID0gJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nICkudmFsKCk7XG5cdFx0XHRpZiAoICdwYXJ0bmVyLW9mZmVycycgPT09IGJlbmVmaXRUeXBlICkge1xuXHRcdFx0XHRkYXRhID0ge1xuXHRcdFx0XHRcdCdhY3Rpb24nIDogJ2JlbmVmaXRfZm9ybV9zdWJtaXQnLFxuXHRcdFx0XHRcdCdtaW5ucG9zdF9tZW1iZXJzaGlwX2JlbmVmaXRfZm9ybV9ub25jZScgOiAkYnV0dG9uLmRhdGEoICdiZW5lZml0LW5vbmNlJyApLFxuXHRcdFx0XHRcdCdjdXJyZW50X3VybCcgOiAkKCAnaW5wdXRbbmFtZT1cImN1cnJlbnRfdXJsXCJdJykudmFsKCksXG5cdFx0XHRcdFx0J2JlbmVmaXQtbmFtZSc6ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJykudmFsKCksXG5cdFx0XHRcdFx0J2luc3RhbmNlX2lkJyA6ICQoICdbbmFtZT1cImluc3RhbmNlLWlkLScgKyAkYnV0dG9uLnZhbCgpICsgJ1wiXScgKS52YWwoKSxcblx0XHRcdFx0XHQncG9zdF9pZCcgOiAkYnV0dG9uLnZhbCgpLFxuXHRcdFx0XHRcdCdpc19hamF4JyA6ICcxJyxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkLnBvc3QoIHNldHRpbmdzLmFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0XHQvLyBzdWNjZXNzXG5cdFx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdFx0XHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHRcdFx0aWYgKCAwIDwgJHNlbGVjdC5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRcdCRzZWxlY3QucHJvcCggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS5hdHRyKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vIGVycm9yXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiByZXNwb25zZS5kYXRhLnJlbW92ZV9pbnN0YW5jZV92YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0JCggJ29wdGlvbicsICRzZWxlY3QgKS5lYWNoKCBmdW5jdGlvbiggaSApIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoICQoIHRoaXMgKS52YWwoKSA9PT0gcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHQkKCB0aGlzICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ly8gcmUtZW5hYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0XHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0XHQkc3RhdHVzLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmFkZENsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzICk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCAwIDwgJCggJy5tLWZvcm0tbWVtYmVyc2hpcC1iZW5lZml0JyApLmxlbmd0aCApIHtcblx0XHRcdGJlbmVmaXRGb3JtKCk7XG5cdFx0fVxuXHR9KTtcblxuXHQkKCAnLmEtcmVmcmVzaC1wYWdlJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRsb2NhdGlvbi5yZWxvYWQoKTtcblx0fSk7XG5cbn0gKSggalF1ZXJ5ICk7XG4iLCIoIGZ1bmN0aW9uKCAkICkge1xuXHRmdW5jdGlvbiBtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCggdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICkge1xuXHRcdGlmICggdHlwZW9mIGdhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdGlmICggdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7IFxuXHRcdCQoICcubS1zdXBwb3J0LWN0YS10b3AgLmEtc3VwcG9ydC1idXR0b24nICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciB2YWx1ZSA9ICcnO1xuXHRcdFx0aWYgKCAkKCAnc3ZnJywgJCggdGhpcyApICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0dmFsdWUgPSAkKCAnc3ZnJywgJCggdGhpcyApICkuYXR0ciggJ3RpdGxlJyApICsgJyAnO1xuXHRcdFx0fVxuXHRcdFx0dmFsdWUgPSB2YWx1ZSArICQoIHRoaXMgKS50ZXh0KCk7XG5cdFx0XHRtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCggJ2V2ZW50JywgJ1N1cHBvcnQgQ1RBIC0gSGVhZGVyJywgJ0NsaWNrOiAnICsgdmFsdWUsIGxvY2F0aW9uLnBhdGhuYW1lICk7XG5cdFx0fSk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwLCB1bmRlZmluZWQgKSB7XG5cblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0TWVtYmVyc2hpcCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdCdkZWJ1ZycgOiBmYWxzZSwgLy8gdGhpcyBjYW4gYmUgc2V0IHRvIHRydWUgb24gcGFnZSBsZXZlbCBvcHRpb25zXG5cdFx0J2Ftb3VudF92aWV3ZXInIDogJy5hbW91bnQgaDMnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYS1mb3JtLWl0ZW0tbWVtYmVyc2hpcC1mcmVxdWVuY3knLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzX3R5cGUnIDogJ3NlbGVjdCcsXG5cdFx0J2xldmVsc19jb250YWluZXInIDogJy5vLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVscycsXG5cdFx0J3NpbmdsZV9sZXZlbF9jb250YWluZXInIDogJy5tLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVsJyxcblx0XHQnc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3InIDogJy5tLW1lbWJlci1sZXZlbC1icmllZicsXG5cdFx0J2ZsaXBwZWRfaXRlbXMnIDogJ2Rpdi5hbW91bnQsIGRpdi5lbnRlcicsXG5cdFx0J2xldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yJyA6ICcuc2hvdy1mcmVxdWVuY3knLFxuXHRcdCdjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmFtb3VudCAuYS1idXR0b24tZmxpcCcsXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5lbnRlciBpbnB1dC5hbW91bnQtZW50cnknLFxuXHR9OyAvLyBlbmQgZGVmYXVsdHNcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cblx0XHRpbml0OiBmdW5jdGlvbiggcmVzZXQsIGFtb3VudCApIHtcblx0XHRcdC8vIFBsYWNlIGluaXRpYWxpemF0aW9uIGxvZ2ljIGhlcmVcblx0XHRcdC8vIFlvdSBhbHJlYWR5IGhhdmUgYWNjZXNzIHRvIHRoZSBET00gZWxlbWVudCBhbmRcblx0XHRcdC8vIHRoZSBvcHRpb25zIHZpYSB0aGUgaW5zdGFuY2UsIGUuZy4gdGhpcy5lbGVtZW50XG5cdFx0XHQvLyBhbmQgdGhpcy5vcHRpb25zXG5cdFx0XHQvLyB5b3UgY2FuIGFkZCBtb3JlIGZ1bmN0aW9ucyBsaWtlIHRoZSBvbmUgYmVsb3cgYW5kXG5cdFx0XHQvLyBjYWxsIHRoZW0gbGlrZSBzbzogdGhpcy55b3VyT3RoZXJGdW5jdGlvbih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucykuXG5cdFx0XHR0aGlzLmNhdGNoSGFzaExpbmtzKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLmxldmVsRmxpcHBlciggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuc3RhcnRMZXZlbENsaWNrKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdH0sXG5cblx0XHRjYXRjaEhhc2hMaW5rczogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCdhW2hyZWYqPVwiI1wiXTpub3QoW2hyZWY9XCIjXCJdKScsIGVsZW1lbnQpLmNsaWNrKGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0dmFyIHRhcmdldCA9ICQoZS50YXJnZXQpO1xuXHRcdFx0XHRpZiAodGFyZ2V0LnBhcmVudCgnLmNvbW1lbnQtdGl0bGUnKS5sZW5ndGggPT0gMCAmJiBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgPT0gdGhpcy5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgJiYgbG9jYXRpb24uaG9zdG5hbWUgPT0gdGhpcy5ob3N0bmFtZSkge1xuXHRcdFx0XHRcdHZhciB0YXJnZXQgPSAkKHRoaXMuaGFzaCk7XG5cdFx0XHRcdFx0dGFyZ2V0ID0gdGFyZ2V0Lmxlbmd0aCA/IHRhcmdldCA6ICQoJ1tuYW1lPScgKyB0aGlzLmhhc2guc2xpY2UoMSkgKyddJyk7XG5cdFx0XHRcdFx0aWYgKHRhcmdldC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdCQoJ2h0bWwsYm9keScpLmFuaW1hdGUoe1xuXHRcdFx0XHRcdFx0XHRzY3JvbGxUb3A6IHRhcmdldC5vZmZzZXQoKS50b3Bcblx0XHRcdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIGNhdGNoTGlua3NcblxuXHRcdGxldmVsRmxpcHBlcjogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgYW1vdW50ID0gMDtcblx0XHRcdHZhciBsZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX251bWJlciA9IDA7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeSA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gJyc7XG5cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbHNfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCApLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5mbGlwcGVkX2l0ZW1zLCAkKHRoaXMpICkud3JhcEFsbCggJzxkaXYgY2xhc3M9XCJmbGlwcGVyXCIvPicgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKHRoaXMpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXG5cdFx0XHRcdFx0XHRpZiAoIGZyZXF1ZW5jeSA9PSAxICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC15ZWFybHknICkgKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeSA9PSAxMiApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQtbW9udGhseScgKSApO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cblx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlRnJlcXVlbmN5KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAkKCBvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciwgZWxlbWVudCkudGV4dChmcmVxdWVuY3lfbmFtZSk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS52YWwoKTtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRoYXQuY2hhbmdlQW1vdW50UHJldmlldyggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpLnBhcmVudCgpICkudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgbGV2ZWxGbGlwcGVyXG5cblx0XHRjaGVja0xldmVsOiBmdW5jdGlvbiggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgbGV2ZWwgPSBNaW5uUG9zdE1lbWJlcnNoaXAuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUgKTtcblxuXHRcdFx0JCgnaDInLCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKCAkKHRoaXMpLnRleHQoKSA9PSBsZXZlbFsnbmFtZSddICkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0JCh0aGlzKS5wYXJlbnQoKS5wYXJlbnQoKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGNoYW5nZUZyZXF1ZW5jeTogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0XHR2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHRcdHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0dmFyIGZyZXF1ZW5jeSAgICAgID0gcGFyc2VJbnQoIHNlbGVjdGVkLnNwbGl0KCcgLSAnKVsxXSApO1xuXG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnZhbCggc2VsZWN0ZWQgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkucHJvcCggJ3NlbGVjdGVkJywgc2VsZWN0ZWQgKTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS5kYXRhKCAnZnJlcXVlbmN5JywgZnJlcXVlbmN5ICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlRnJlcXVlbmN5XG5cblx0XHRjaGFuZ2VBbW91bnRQcmV2aWV3OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHRcdHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdFx0dmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlQW1vdW50UHJldmlld1xuXG5cdFx0c3RhcnRMZXZlbENsaWNrOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJy5zdGFydC1sZXZlbCcpLmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgbGV2ZWxfY2xhc3MgPSAkKCB0aGlzICkucHJvcCggJ2NsYXNzJyApO1xuXHRcdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gbGV2ZWxfY2xhc3NbbGV2ZWxfY2xhc3MubGVuZ3RoIC0xXTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIsIGVsZW1lbnQgKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICsgJyAnICsgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBzdGFydExldmVsQ2xpY2tcblxuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xuXG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXAgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQgKSB7XG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdFRyYWNrU3VibWl0Jyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0dHlwZTogJ2V2ZW50Jyxcblx0XHRjYXRlZ29yeTogJ1N1cHBvcnQgVXMnLFxuXHRcdGFjdGlvbjogJ0JlY29tZSBBIE1lbWJlcicsXG5cdFx0bGFiZWw6IGxvY2F0aW9uLnBhdGhuYW1lXG5cdH07XG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblx0XHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcblxuXHRcdFx0JCggdGhpcy5lbGVtZW50ICkuc3VibWl0KCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdHRoYXQuYW5hbHl0aWNzRXZlbnRUcmFjayhcblx0XHRcdFx0XHRvcHRpb25zLnR5cGUsXG5cdFx0XHRcdFx0b3B0aW9ucy5jYXRlZ29yeSxcblx0XHRcdFx0XHRvcHRpb25zLmFjdGlvbixcblx0XHRcdFx0XHRvcHRpb25zLmxhYmVsXG5cdFx0XHRcdCk7XG5cdFx0XHRcdC8vIGFsc28gYnViYmxlcyB0aGUgZXZlbnQgdXAgdG8gc3VibWl0IHRoZSBmb3JtXG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0YW5hbHl0aWNzRXZlbnRUcmFjazogZnVuY3Rpb24oIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApIHtcblx0XHRcdGlmICggdHlwZW9mIGdhID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICk7XG5cdFx0fSwgLy8gZW5kIGFuYWx5dGljc0V2ZW50VHJhY2tcblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCApO1xuIl19
