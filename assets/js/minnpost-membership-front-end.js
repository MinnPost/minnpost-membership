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
    userCurrentLevel: '.a-current-level',
    declineBenefits: '.m-decline-benefits-select input[type="radio"]',
    giftSelector: '.m-membership-gift-selector',
    subscriptionsSelector: '.m-select-subscription input[type="checkbox"]',
    declineSubscriptions: '#subscription-decline'
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
      var $declineBenefits = $(this.element).find(this.options.declineBenefits);
      var $subscriptions = $(this.element).find(this.options.subscriptionsSelector);

      if (!($amount.length > 0 && $frequency.length > 0 && $suggestedAmount.length > 0)) {
        return;
      } // Set up the UI for the current field state on (re-)load


      this.setAmountLabels($frequency.filter(':checked').val());
      this.checkAndSetLevel();
      $frequency.on('change', this.onFrequencyChange.bind(this));
      $suggestedAmount.on('change', this.onSuggestedAmountChange.bind(this));
      $amount.on('keyup mouseup', this.onAmountChange.bind(this));

      if (!($declineBenefits.length > 0 && $subscriptions.length > 0)) {
        return;
      } // Set up the UI for the current field state on (re-)load


      if ($subscriptions.not(this.options.declineSubscriptions).is(':checked')) {
        $(this.element).find(this.options.declineSubscriptions).prop('checked', false);
      }

      this.onDeclineBenefitsChange();
      $declineBenefits.on('change', this.onDeclineBenefitsChange.bind(this));
      $subscriptions.on('click', this.onSubscriptionsClick.bind(this));
    },
    // end init
    onFrequencyChange: function onFrequencyChange(event) {
      this.setAmountLabels($(event.target).val());
      this.checkAndSetLevel();
    },
    // end onFrequencyChange
    onSuggestedAmountChange: function onSuggestedAmountChange(event) {
      $(this.element).find(this.options.amountField).val(null);
      this.checkAndSetLevel();
    },
    // end onSuggestedAmountChange
    onAmountChange: function onAmountChange(event) {
      this.clearAmountSelector(event);
      var $target = $(event.target);

      if ($target.data('last-value') != $target.val()) {
        $target.data('last-value', $target.val());
        this.checkAndSetLevel();
      }
    },
    // end onAmountChange
    onDeclineBenefitsChange: function onDeclineBenefitsChange(event) {
      var $giftSelector = $(this.element).find(this.options.giftSelector);
      var decline = $(this.element).find(this.options.declineBenefits).filter(':checked').val();

      if (decline === 'true') {
        $giftSelector.hide();
        return;
      }

      $giftSelector.show();
    },
    // end onDeclineBenefitsChange
    onSubscriptionsClick: function onSubscriptionsClick(event) {
      var $subscriptions = $(this.element).find(this.options.subscriptionsSelector).not(this.options.declineSubscriptions);
      var $decline = $(this.element).find(this.options.declineSubscriptions);

      if ($(event.target).is(this.options.declineSubscriptions)) {
        $subscriptions.prop('checked', false);
        return;
      }

      $decline.prop('checked', false);
    },
    // end onSubscriptionsChange
    clearAmountSelector: function clearAmountSelector(event) {
      var $suggestedAmount = $(this.options.amountSelector);

      if ($(event.target).val() === '') {
        return;
      }

      $suggestedAmount.prop('checked', false);
    },
    // end clearAmountSelector
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIiwidHJhY2stc3VibWl0LmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsIm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCIkIiwiZG9jdW1lbnQiLCJwbHVnaW5OYW1lIiwiZGVmYXVsdHMiLCJmcmVxdWVuY3lTZWxlY3RvciIsImFtb3VudEdyb3VwIiwiYW1vdW50U2VsZWN0b3IiLCJhbW91bnRMYWJlbHMiLCJhbW91bnRWYWx1ZSIsImFtb3VudERlc2NyaXB0aW9uIiwiYW1vdW50RmllbGQiLCJsZXZlbFZpZXdlciIsImxldmVsTmFtZSIsInVzZXJDdXJyZW50TGV2ZWwiLCJkZWNsaW5lQmVuZWZpdHMiLCJnaWZ0U2VsZWN0b3IiLCJzdWJzY3JpcHRpb25zU2VsZWN0b3IiLCJkZWNsaW5lU3Vic2NyaXB0aW9ucyIsIlBsdWdpbiIsImVsZW1lbnQiLCJvcHRpb25zIiwiZXh0ZW5kIiwiX2RlZmF1bHRzIiwiX25hbWUiLCJpbml0IiwiJGZyZXF1ZW5jeSIsImZpbmQiLCIkc3VnZ2VzdGVkQW1vdW50IiwiJGFtb3VudCIsIiRkZWNsaW5lQmVuZWZpdHMiLCIkc3Vic2NyaXB0aW9ucyIsImxlbmd0aCIsInNldEFtb3VudExhYmVscyIsImZpbHRlciIsInZhbCIsImNoZWNrQW5kU2V0TGV2ZWwiLCJvbiIsIm9uRnJlcXVlbmN5Q2hhbmdlIiwiYmluZCIsIm9uU3VnZ2VzdGVkQW1vdW50Q2hhbmdlIiwib25BbW91bnRDaGFuZ2UiLCJub3QiLCJpcyIsInByb3AiLCJvbkRlY2xpbmVCZW5lZml0c0NoYW5nZSIsIm9uU3Vic2NyaXB0aW9uc0NsaWNrIiwiZXZlbnQiLCJ0YXJnZXQiLCJjbGVhckFtb3VudFNlbGVjdG9yIiwiJHRhcmdldCIsIiRnaWZ0U2VsZWN0b3IiLCJkZWNsaW5lIiwiaGlkZSIsInNob3ciLCIkZGVjbGluZSIsImZyZXF1ZW5jeVN0cmluZyIsIiRncm91cHMiLCIkc2VsZWN0ZWQiLCJpbmRleCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJmcmVxdWVuY3lfc3RyaW5nIiwic3BsaXQiLCJmcmVxdWVuY3lfbmFtZSIsInNob3dOZXdMZXZlbCIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbFZpZXdlckNvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJyZXBsYWNlIiwibWF0Y2giLCJkZWMiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJ0b0xvd2VyQ2FzZSIsIm1lbWJlcl9sZXZlbCIsImh0bWwiLCJ0ZXh0IiwiZm4iLCJlYWNoIiwialF1ZXJ5IiwiYmVuZWZpdEZvcm0iLCJwZXJmb3JtYW5jZSIsIm5hdmlnYXRpb24iLCJsb2NhdGlvbiIsInJlbG9hZCIsInJlbW92ZUF0dHIiLCJjbGljayIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsIiRzdGF0dXMiLCJwYXJlbnQiLCIkc2VsZWN0IiwiYmVuZWZpdFR5cGUiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwic3VjY2VzcyIsImJ1dHRvbl92YWx1ZSIsImJ1dHRvbl9sYWJlbCIsImJ1dHRvbl9jbGFzcyIsImJ1dHRvbl9hdHRyIiwibWVzc2FnZSIsIm1lc3NhZ2VfY2xhc3MiLCJhdHRyIiwicmVtb3ZlX2luc3RhbmNlX3ZhbHVlIiwiaSIsInJlbW92ZSIsInJlYWR5IiwibXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQiLCJjYXRlZ29yeSIsImFjdGlvbiIsImxhYmVsIiwidmFsdWUiLCJnYSIsInBhdGhuYW1lIiwidW5kZWZpbmVkIiwicmVzZXQiLCJjYXRjaEhhc2hMaW5rcyIsImxldmVsRmxpcHBlciIsInN0YXJ0TGV2ZWxDbGljayIsImUiLCJob3N0bmFtZSIsImhhc2giLCJzbGljZSIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwibGV2ZWxfbnVtYmVyIiwibGV2ZWxzX2NvbnRhaW5lciIsInNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yIiwiZmxpcHBlZF9pdGVtcyIsIndyYXBBbGwiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsImNsb3Nlc3QiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwiY2hhbmdlQW1vdW50UHJldmlldyIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyIsInN1Ym1pdCIsImFuYWx5dGljc0V2ZW50VHJhY2siXSwibWFwcGluZ3MiOiI7O0FBQUE7O0FBQUMsQ0FBQyxVQUFXQSxNQUFYLEVBQW9CO0FBQ3JCLFdBQVNDLGtCQUFULENBQTZCQyxJQUE3QixFQUFtQ0MsUUFBbkMsRUFBOEM7QUFDN0MsU0FBS0QsSUFBTCxHQUFZLEVBQVo7O0FBQ0EsUUFBSSxPQUFPQSxJ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QyxLQUFsQyxDQUFGO0FBQ0E7QUFDQTs7QUFFREUsTUFBQUEsRUFBRSxDQUFFLE1BQUYsRUFBVWpJLElBQVYsRUFBZ0I2SCxRQUFoQixFQUEwQkMsTUFBMUIsRUFBa0NDLEtBQWxDLEVBQXlDQyxLQUF6QyxDQUFGO0FBQ0EsS0EzQmlCLENBMkJmOztBQTNCZSxHQUFuQixDQTFCa0MsQ0FzRC9CO0FBR0g7QUFDQTs7QUFDQWxILEVBQUFBLENBQUMsQ0FBQytFLEVBQUYsQ0FBSzdFLFVBQUwsSUFBbUIsVUFBV2tCLE9BQVgsRUFBcUI7QUFDdkMsV0FBTyxLQUFLNEQsSUFBTCxDQUFVLFlBQVk7QUFDNUIsVUFBSyxDQUFFaEYsQ0FBQyxDQUFDdkIsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZeUIsVUFBMUIsQ0FBUCxFQUFnRDtBQUMvQ0YsUUFBQUEsQ0FBQyxDQUFDdkIsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZeUIsVUFBMUIsRUFBc0MsSUFBSWdCLE1BQUosQ0FBWSxJQUFaLEVBQWtCRSxPQUFsQixDQUF0QztBQUNBO0FBQ0QsS0FKTSxDQUFQO0FBS0EsR0FORDtBQU9BLENBbEVBLEVBa0VHNkQsTUFsRUgsRUFrRVcxRyxNQWxFWCxFQWtFbUIwQixRQWxFbkIiLCJmaWxlIjoibWlubnBvc3QtbWVtYmVyc2hpcC1mcm9udC1lbmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyI7KGZ1bmN0aW9uICggd2luZG93ICkge1xuXHRmdW5jdGlvbiBNaW5uUG9zdE1lbWJlcnNoaXAoIGRhdGEsIHNldHRpbmdzICkge1xuXHRcdHRoaXMuZGF0YSA9IHt9O1xuXHRcdGlmICh0eXBlb2YgZGF0YSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRoaXMuZGF0YSA9IGRhdGE7XG5cdFx0fVxuXG5cdFx0dGhpcy5zZXR0aW5ncyA9IHt9O1xuXHRcdGlmICh0eXBlb2Ygc2V0dGluZ3MgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG5cdFx0fVxuXG5cdFx0dGhpcy5wcmV2aW91c0Ftb3VudCA9ICcnO1xuXHRcdGlmICggdHlwZW9mIHRoaXMuZGF0YS5jdXJyZW50X3VzZXIgIT09ICd1bmRlZmluZWQnICYmXG5cdFx0ICAgICB0eXBlb2YgdGhpcy5kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0dGhpcy5wcmV2aW91c0Ftb3VudCA9IHRoaXMuZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50O1xuXHRcdH1cblx0fVxuXG5cdE1pbm5Qb3N0TWVtYmVyc2hpcC5wcm90b3R5cGUgPSB7XG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlICkge1xuXHRcdFx0dmFyIHRoaXN5ZWFyID0gcGFyc2VJbnQoIGFtb3VudCApICogcGFyc2VJbnQoIGZyZXF1ZW5jeSApO1xuXHRcdFx0aWYgKCB0eXBlb2YgdGhpcy5wcmV2aW91c0Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5wcmV2aW91c0Ftb3VudCAhPT0gJycgKSB7XG5cdFx0XHRcdHZhciBwcmlvcl95ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCB0aGlzLnByZXZpb3VzQW1vdW50LnByaW9yX3llYXJfY29udHJpYnV0aW9ucywgMTAgKTtcblx0XHRcdFx0dmFyIGNvbWluZ195ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCB0aGlzLnByZXZpb3VzQW1vdW50LmNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMsIDEwICk7XG5cdFx0XHRcdHZhciBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCA9IHBhcnNlSW50KCB0aGlzLnByZXZpb3VzQW1vdW50LmFubnVhbF9yZWN1cnJpbmdfYW1vdW50LCAxMCApO1xuXHRcdFx0XHQvLyBjYWxjdWxhdGUgbWVtYmVyIGxldmVsIGZvcm11bGFcblx0XHRcdFx0aWYgKCB0eXBlID09PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHByaW9yX3llYXJfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGhpc3llYXIgPSBNYXRoLm1heCggcHJpb3JfeWVhcl9hbW91bnQsIGNvbWluZ195ZWFyX2Ftb3VudCwgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0TGV2ZWwoIHRoaXN5ZWFyICk7XG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGdldExldmVsOiBmdW5jdGlvbiggdGhpc3llYXIgKSB7XG5cdFx0XHR2YXIgbGV2ZWwgPSB7fTtcblx0XHRcdGlmICggdGhpc3llYXIgPiAwICYmIHRoaXN5ZWFyIDwgNjAgKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnQnJvbnplJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHRoaXN5ZWFyID4gNTkgJiYgdGhpc3llYXIgPCAxMjApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdTaWx2ZXInO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAyO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDExOSAmJiB0aGlzeWVhciA8IDI0MCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0dvbGQnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAzO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDIzOSkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1BsYXRpbnVtJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gNDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgZ2V0TGV2ZWxcblx0fTtcblxuXHR3aW5kb3cuTWlublBvc3RNZW1iZXJzaGlwID0gbmV3IE1pbm5Qb3N0TWVtYmVyc2hpcChcblx0XHR3aW5kb3cubWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLFxuXHRcdHdpbmRvdy5taW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzXG5cdCk7XG59KSggd2luZG93ICk7XG4iLCIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXAgKSB7XG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdEFtb3VudFNlbGVjdCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdGZyZXF1ZW5jeVNlbGVjdG9yOiAnLm0tZnJlcXVlbmN5LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGFtb3VudEdyb3VwOiAnLm0tZnJlcXVlbmN5LWdyb3VwJyxcblx0XHRhbW91bnRTZWxlY3RvcjogJy5tLWFtb3VudC1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRhbW91bnRMYWJlbHM6ICcubS1hbW91bnQtc2VsZWN0IGxhYmVsJyxcblx0XHRhbW91bnRWYWx1ZTogJ3N0cm9uZycsXG5cdFx0YW1vdW50RGVzY3JpcHRpb246ICcuYS1hbW91bnQtZGVzY3JpcHRpb24nLFxuXHRcdGFtb3VudEZpZWxkOiAnLmEtYW1vdW50LWZpZWxkICNhbW91bnQnLFxuXHRcdGxldmVsVmlld2VyOiAnLmEtc2hvdy1sZXZlbCcsXG5cdFx0bGV2ZWxOYW1lOiAnLmEtbGV2ZWwnLFxuXHRcdHVzZXJDdXJyZW50TGV2ZWw6ICcuYS1jdXJyZW50LWxldmVsJyxcblx0XHRkZWNsaW5lQmVuZWZpdHM6ICcubS1kZWNsaW5lLWJlbmVmaXRzLXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGdpZnRTZWxlY3RvcjogJy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvcicsXG5cdFx0c3Vic2NyaXB0aW9uc1NlbGVjdG9yOiAnLm0tc2VsZWN0LXN1YnNjcmlwdGlvbiBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nLFxuXHRcdGRlY2xpbmVTdWJzY3JpcHRpb25zOiAnI3N1YnNjcmlwdGlvbi1kZWNsaW5lJ1xuXHR9O1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cdFx0aW5pdDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgJGZyZXF1ZW5jeSA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciApO1xuXHRcdFx0dmFyICRzdWdnZXN0ZWRBbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKTtcblx0XHRcdHZhciAkYW1vdW50ID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICk7XG5cdFx0XHR2YXIgJGRlY2xpbmVCZW5lZml0cyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lQmVuZWZpdHMgKTtcblx0XHRcdHZhciAkc3Vic2NyaXB0aW9ucyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5zdWJzY3JpcHRpb25zU2VsZWN0b3IgKTtcblx0XHRcdGlmICggISggJGFtb3VudC5sZW5ndGggPiAwICYmXG5cdFx0XHQgICAgICAgICRmcmVxdWVuY3kubGVuZ3RoID4gMCAmJlxuXHRcdFx0ICAgICAgICAkc3VnZ2VzdGVkQW1vdW50Lmxlbmd0aCA+IDAgKSApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTZXQgdXAgdGhlIFVJIGZvciB0aGUgY3VycmVudCBmaWVsZCBzdGF0ZSBvbiAocmUtKWxvYWRcblx0XHRcdHRoaXMuc2V0QW1vdW50TGFiZWxzKCAkZnJlcXVlbmN5LmZpbHRlcignOmNoZWNrZWQnKS52YWwoKSApO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCk7XG5cblx0XHRcdCRmcmVxdWVuY3kub24oICdjaGFuZ2UnLCB0aGlzLm9uRnJlcXVlbmN5Q2hhbmdlLmJpbmQodGhpcykgKTtcblx0XHRcdCRzdWdnZXN0ZWRBbW91bnQub24oICdjaGFuZ2UnLCB0aGlzLm9uU3VnZ2VzdGVkQW1vdW50Q2hhbmdlLmJpbmQodGhpcykgKTtcblx0XHRcdCRhbW91bnQub24oICdrZXl1cCBtb3VzZXVwJywgdGhpcy5vbkFtb3VudENoYW5nZS5iaW5kKHRoaXMpICk7XG5cblx0XHRcdGlmICggISAoICRkZWNsaW5lQmVuZWZpdHMubGVuZ3RoID4gMCAmJiAkc3Vic2NyaXB0aW9ucy5sZW5ndGggPiAwICkgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2V0IHVwIHRoZSBVSSBmb3IgdGhlIGN1cnJlbnQgZmllbGQgc3RhdGUgb24gKHJlLSlsb2FkXG5cdFx0XHRpZiAoICRzdWJzY3JpcHRpb25zLm5vdCggdGhpcy5vcHRpb25zLmRlY2xpbmVTdWJzY3JpcHRpb25zICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdFx0JCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVTdWJzY3JpcHRpb25zICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5vbkRlY2xpbmVCZW5lZml0c0NoYW5nZSgpO1xuXG5cdFx0XHQkZGVjbGluZUJlbmVmaXRzLm9uKCAnY2hhbmdlJywgdGhpcy5vbkRlY2xpbmVCZW5lZml0c0NoYW5nZS5iaW5kKCB0aGlzICkgKTtcblx0XHRcdCRzdWJzY3JpcHRpb25zLm9uKCAnY2xpY2snLCB0aGlzLm9uU3Vic2NyaXB0aW9uc0NsaWNrLmJpbmQoIHRoaXMgKSApO1xuXHRcdH0sIC8vIGVuZCBpbml0XG5cblx0XHRvbkZyZXF1ZW5jeUNoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoICQoIGV2ZW50LnRhcmdldCApLnZhbCgpICk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoKTtcblx0XHR9LCAvLyBlbmQgb25GcmVxdWVuY3lDaGFuZ2VcblxuXHRcdG9uU3VnZ2VzdGVkQW1vdW50Q2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHQkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQgKS52YWwoIG51bGwgKTtcblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCgpO1xuXHRcdH0sIC8vIGVuZCBvblN1Z2dlc3RlZEFtb3VudENoYW5nZVxuXG5cdFx0b25BbW91bnRDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMuY2xlYXJBbW91bnRTZWxlY3RvciggZXZlbnQgKTtcblxuXHRcdFx0dmFyICR0YXJnZXQgPSAkKCBldmVudC50YXJnZXQgKTtcblx0XHRcdGlmICggJHRhcmdldC5kYXRhKCAnbGFzdC12YWx1ZScgKSAhPSAkdGFyZ2V0LnZhbCgpICkge1xuXHRcdFx0XHQkdGFyZ2V0LmRhdGEoICdsYXN0LXZhbHVlJywgJHRhcmdldC52YWwoKSApO1xuXHRcdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoKTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgb25BbW91bnRDaGFuZ2VcblxuXHRcdG9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgJGdpZnRTZWxlY3RvciA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5naWZ0U2VsZWN0b3IgKTtcblx0XHRcdHZhciBkZWNsaW5lID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVCZW5lZml0cyApLmZpbHRlciggJzpjaGVja2VkJyApLnZhbCgpO1xuXG5cdFx0XHRpZiAoIGRlY2xpbmUgPT09ICd0cnVlJyApIHtcblx0XHRcdFx0JGdpZnRTZWxlY3Rvci5oaWRlKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JGdpZnRTZWxlY3Rvci5zaG93KCk7XG5cdFx0fSwgLy8gZW5kIG9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlXG5cblx0XHRvblN1YnNjcmlwdGlvbnNDbGljazogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyICRzdWJzY3JpcHRpb25zID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLnN1YnNjcmlwdGlvbnNTZWxlY3RvciApLm5vdCggdGhpcy5vcHRpb25zLmRlY2xpbmVTdWJzY3JpcHRpb25zICk7XG5cdFx0XHR2YXIgJGRlY2xpbmUgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZGVjbGluZVN1YnNjcmlwdGlvbnMgKTtcblxuXHRcdFx0aWYgKCAkKCBldmVudC50YXJnZXQgKS5pcyggdGhpcy5vcHRpb25zLmRlY2xpbmVTdWJzY3JpcHRpb25zICkgKSB7XG5cdFx0XHRcdCRzdWJzY3JpcHRpb25zLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQkZGVjbGluZS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0fSwgLy8gZW5kIG9uU3Vic2NyaXB0aW9uc0NoYW5nZVxuXG5cdFx0Y2xlYXJBbW91bnRTZWxlY3RvcjogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyICRzdWdnZXN0ZWRBbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKTtcblxuXHRcdFx0aWYgKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSA9PT0gJycgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JHN1Z2dlc3RlZEFtb3VudC5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0fSwgLy8gZW5kIGNsZWFyQW1vdW50U2VsZWN0b3JcblxuXHRcdHNldEFtb3VudExhYmVsczogZnVuY3Rpb24oIGZyZXF1ZW5jeVN0cmluZyApIHtcblx0XHRcdHZhciAkZ3JvdXBzID0gJCggdGhpcy5vcHRpb25zLmFtb3VudEdyb3VwICk7XG5cdFx0XHR2YXIgJHNlbGVjdGVkID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yIClcblx0XHRcdCAgICAuZmlsdGVyKCAnOmNoZWNrZWQnICk7XG5cdFx0XHR2YXIgaW5kZXggPSAkc2VsZWN0ZWQuZGF0YSggJ2luZGV4JyApO1xuXG5cdFx0XHQkZ3JvdXBzLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0JGdyb3Vwcy5maWx0ZXIoICdbZGF0YS1mcmVxdWVuY3k9XCInICsgZnJlcXVlbmN5U3RyaW5nICsgJ1wiXScgKVxuXHRcdFx0XHQuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQkc2VsZWN0ZWQucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdFx0JGdyb3Vwcy5maWx0ZXIoICcuYWN0aXZlJyApXG5cdFx0XHRcdC5maW5kKCAnaW5wdXRbdHlwZT1cInJhZGlvXCJdW2RhdGEtaW5kZXg9XCInICsgaW5kZXggKyAnXCJdJyApXG5cdFx0XHRcdC5wcm9wKCAnY2hlY2tlZCcsIHRydWUgKTtcblx0XHR9LCAvLyBlbmQgc2V0QW1vdW50TGFiZWxzXG5cblx0XHRjaGVja0FuZFNldExldmVsOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKS5maWx0ZXIoICc6Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdGlmICggdHlwZW9mIGFtb3VudCA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCApLnZhbCgpO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdHZhciBmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHR2YXIgbGV2ZWwgPSBNaW5uUG9zdE1lbWJlcnNoaXAuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lICk7XG5cdFx0XHR0aGlzLnNob3dOZXdMZXZlbCggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMsIGxldmVsICk7XG5cdFx0fSwgLy8gZW5kIGNoZWNrQW5kU2V0TGV2ZWxcblxuXHRcdHNob3dOZXdMZXZlbDogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICkge1xuXHRcdFx0dmFyIG1lbWJlcl9sZXZlbF9wcmVmaXggPSAnJztcblx0XHRcdHZhciBvbGRfbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbFZpZXdlckNvbnRhaW5lciA9IG9wdGlvbnMubGV2ZWxWaWV3ZXI7IC8vIHRoaXMgc2hvdWxkIGNoYW5nZSB3aGVuIHdlIHJlcGxhY2UgdGhlIHRleHQsIGlmIHRoZXJlIGlzIGEgbGluayBpbnNpZGUgaXRcblx0XHRcdHZhciBkZWNvZGVIdG1sRW50aXR5ID0gZnVuY3Rpb24oIHN0ciApIHtcblx0XHRcdFx0cmV0dXJuIHN0ci5yZXBsYWNlKCAvJiMoXFxkKyk7L2csIGZ1bmN0aW9uKCBtYXRjaCwgZGVjICkge1xuXHRcdFx0XHRcdHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKCBkZWMgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0bWVtYmVyX2xldmVsX3ByZWZpeCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5tZW1iZXJfbGV2ZWxfcHJlZml4O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbFZpZXdlcikucHJvcCggJ2NsYXNzJywgJ2Etc2hvdy1sZXZlbCBhLXNob3ctbGV2ZWwtJyArIGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApO1xuXG5cdFx0XHRcdGlmICggJCggb3B0aW9ucy51c2VyQ3VycmVudExldmVsICkubGVuZ3RoID4gMCAmJiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdFx0aWYgKCAnYScsICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdFx0bGV2ZWxWaWV3ZXJDb250YWluZXIgPSBvcHRpb25zLmxldmVsVmlld2VyICsgJyBhJztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvbGRfbGV2ZWwgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5yZXBsYWNlKCBtZW1iZXJfbGV2ZWxfcHJlZml4LCAnJyApO1xuXG5cdFx0XHRcdFx0aWYgKCBvbGRfbGV2ZWwgIT09IGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApIHtcblx0XHRcdFx0XHRcdCQoIGxldmVsVmlld2VyQ29udGFpbmVyICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmRhdGEoICdjaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggbGV2ZWxWaWV3ZXJDb250YWluZXIgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsVmlld2VyICkuZGF0YSggJ25vdC1jaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxOYW1lLCBvcHRpb25zLmxldmVsVmlld2VyKS50ZXh0KCBsZXZlbFsnbmFtZSddICk7XG5cdFx0XHR9XG5cblx0XHR9LCAvLyBlbmQgc2hvd05ld0xldmVsXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCApO1xuIiwiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBiZW5lZml0Rm9ybSgpIHtcblx0XHRpZiAoIDIgPT09IHBlcmZvcm1hbmNlLm5hdmlnYXRpb24udHlwZSApIHtcblx0XHRcdGxvY2F0aW9uLnJlbG9hZCggdHJ1ZSApO1xuXHRcdH1cblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24uYS1idXR0b24tZGlzYWJsZWQnICkucmVtb3ZlQXR0ciggJ2Rpc2FibGVkJyApO1xuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHZhciAkYnV0dG9uICA9ICQoIHRoaXMgKTtcblx0XHRcdHZhciAkc3RhdHVzICA9ICQoICcubS1iZW5lZml0LW1lc3NhZ2UnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciAkc2VsZWN0ICA9ICQoICdzZWxlY3QnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciBzZXR0aW5ncyA9IG1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3M7XG5cdFx0XHQvLyByZXNldCB0aGUgbWVzc2FnZSBmb3IgY3VycmVudCBzdGF0dXNcblx0XHRcdGlmICggISAnLm0tYmVuZWZpdC1tZXNzYWdlLXN1Y2Nlc3MnICkge1xuXHRcdFx0XHQkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJyApLnJlbW92ZUNsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSBtLWJlbmVmaXQtbWVzc2FnZS1lcnJvciBtLWJlbmVmaXQtbWVzc2FnZS1pbmZvJyApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gc2V0IGJ1dHRvbiB0byBwcm9jZXNzaW5nXG5cdFx0XHQkYnV0dG9uLnRleHQoICdQcm9jZXNzaW5nJyApLmFkZENsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cblx0XHRcdC8vIGRpc2FibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gc2V0IGFqYXggZGF0YVxuXHRcdFx0dmFyIGRhdGEgPSB7fTtcblx0XHRcdHZhciBiZW5lZml0VHlwZSA9ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJyApLnZhbCgpO1xuXHRcdFx0aWYgKCAncGFydG5lci1vZmZlcnMnID09PSBiZW5lZml0VHlwZSApIHtcblx0XHRcdFx0ZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdiZW5lZml0X2Zvcm1fc3VibWl0Jyxcblx0XHRcdFx0XHQnbWlubnBvc3RfbWVtYmVyc2hpcF9iZW5lZml0X2Zvcm1fbm9uY2UnIDogJGJ1dHRvbi5kYXRhKCAnYmVuZWZpdC1ub25jZScgKSxcblx0XHRcdFx0XHQnY3VycmVudF91cmwnIDogJCggJ2lucHV0W25hbWU9XCJjdXJyZW50X3VybFwiXScpLnZhbCgpLFxuXHRcdFx0XHRcdCdiZW5lZml0LW5hbWUnOiAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScpLnZhbCgpLFxuXHRcdFx0XHRcdCdpbnN0YW5jZV9pZCcgOiAkKCAnW25hbWU9XCJpbnN0YW5jZS1pZC0nICsgJGJ1dHRvbi52YWwoKSArICdcIl0nICkudmFsKCksXG5cdFx0XHRcdFx0J3Bvc3RfaWQnIDogJGJ1dHRvbi52YWwoKSxcblx0XHRcdFx0XHQnaXNfYWpheCcgOiAnMScsXG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JC5wb3N0KCBzZXR0aW5ncy5hamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdFx0Ly8gc3VjY2Vzc1xuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdCRzdGF0dXMuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuYWRkQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3MgKTtcblx0XHRcdFx0XHRcdGlmICggMCA8ICRzZWxlY3QubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0XHQkc2VsZWN0LnByb3AoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkuYXR0ciggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBlcnJvclxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnID09PSB0eXBlb2YgcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdCQoICdvcHRpb24nLCAkc2VsZWN0ICkuZWFjaCggZnVuY3Rpb24oIGkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCAkKCB0aGlzICkudmFsKCkgPT09IHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0JCggdGhpcyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIHJlLWVuYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdFx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXHRcdFx0XHRcdFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXHRcdGlmICggMCA8ICQoICcubS1mb3JtLW1lbWJlcnNoaXAtYmVuZWZpdCcgKS5sZW5ndGggKSB7XG5cdFx0XHRiZW5lZml0Rm9ybSgpO1xuXHRcdH1cblx0fSk7XG5cblx0JCggJy5hLXJlZnJlc2gtcGFnZScgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0bG9jYXRpb24ucmVsb2FkKCk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiKCBmdW5jdGlvbiggJCApIHtcblx0ZnVuY3Rpb24gbXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQoIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApIHtcblx0XHRpZiAoIHR5cGVvZiBnYSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkgeyBcblx0XHQkKCAnLm0tc3VwcG9ydC1jdGEtdG9wIC5hLXN1cHBvcnQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgdmFsdWUgPSAnJztcblx0XHRcdGlmICggJCggJ3N2ZycsICQoIHRoaXMgKSApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdHZhbHVlID0gJCggJ3N2ZycsICQoIHRoaXMgKSApLmF0dHIoICd0aXRsZScgKSArICcgJztcblx0XHRcdH1cblx0XHRcdHZhbHVlID0gdmFsdWUgKyAkKCB0aGlzICkudGV4dCgpO1xuXHRcdFx0bXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQoICdldmVudCcsICdTdXBwb3J0IENUQSAtIEhlYWRlcicsICdDbGljazogJyArIHZhbHVlLCBsb2NhdGlvbi5wYXRobmFtZSApO1xuXHRcdH0pO1xuXHR9KTtcblxufSApKCBqUXVlcnkgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCwgdW5kZWZpbmVkICkge1xuXG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHQnZGVidWcnIDogZmFsc2UsIC8vIHRoaXMgY2FuIGJlIHNldCB0byB0cnVlIG9uIHBhZ2UgbGV2ZWwgb3B0aW9uc1xuXHRcdCdhbW91bnRfdmlld2VyJyA6ICcuYW1vdW50IGgzJyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmEtZm9ybS1pdGVtLW1lbWJlcnNoaXAtZnJlcXVlbmN5Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsc190eXBlJyA6ICdzZWxlY3QnLFxuXHRcdCdsZXZlbHNfY29udGFpbmVyJyA6ICcuby1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbHMnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfY29udGFpbmVyJyA6ICcubS1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbCcsXG5cdFx0J3NpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yJyA6ICcubS1tZW1iZXItbGV2ZWwtYnJpZWYnLFxuXHRcdCdmbGlwcGVkX2l0ZW1zJyA6ICdkaXYuYW1vdW50LCBkaXYuZW50ZXInLFxuXHRcdCdsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvcicgOiAnLnNob3ctZnJlcXVlbmN5Jyxcblx0XHQnY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hbW91bnQgLmEtYnV0dG9uLWZsaXAnLFxuXHRcdCdhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuZW50ZXIgaW5wdXQuYW1vdW50LWVudHJ5Jyxcblx0fTsgLy8gZW5kIGRlZmF1bHRzXG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXG5cdFx0aW5pdDogZnVuY3Rpb24oIHJlc2V0LCBhbW91bnQgKSB7XG5cdFx0XHQvLyBQbGFjZSBpbml0aWFsaXphdGlvbiBsb2dpYyBoZXJlXG5cdFx0XHQvLyBZb3UgYWxyZWFkeSBoYXZlIGFjY2VzcyB0byB0aGUgRE9NIGVsZW1lbnQgYW5kXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyB2aWEgdGhlIGluc3RhbmNlLCBlLmcuIHRoaXMuZWxlbWVudFxuXHRcdFx0Ly8gYW5kIHRoaXMub3B0aW9uc1xuXHRcdFx0Ly8geW91IGNhbiBhZGQgbW9yZSBmdW5jdGlvbnMgbGlrZSB0aGUgb25lIGJlbG93IGFuZFxuXHRcdFx0Ly8gY2FsbCB0aGVtIGxpa2Ugc286IHRoaXMueW91ck90aGVyRnVuY3Rpb24odGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpLlxuXHRcdFx0dGhpcy5jYXRjaEhhc2hMaW5rcyggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5sZXZlbEZsaXBwZXIoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN0YXJ0TGV2ZWxDbGljayggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHR9LFxuXG5cdFx0Y2F0Y2hIYXNoTGlua3M6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnYVtocmVmKj1cIiNcIl06bm90KFtocmVmPVwiI1wiXSknLCBlbGVtZW50KS5jbGljayhmdW5jdGlvbihlKSB7XG5cdFx0XHRcdHZhciB0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblx0XHRcdFx0aWYgKHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiYgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpID09IHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpICYmIGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWUpIHtcblx0XHRcdFx0XHR2YXIgdGFyZ2V0ID0gJCh0aGlzLmhhc2gpO1xuXHRcdFx0XHRcdHRhcmdldCA9IHRhcmdldC5sZW5ndGggPyB0YXJnZXQgOiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsnXScpO1xuXHRcdFx0XHRcdGlmICh0YXJnZXQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQkKCdodG1sLGJvZHknKS5hbmltYXRlKHtcblx0XHRcdFx0XHRcdFx0c2Nyb2xsVG9wOiB0YXJnZXQub2Zmc2V0KCkudG9wXG5cdFx0XHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbEZsaXBwZXI6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIGFtb3VudCA9IDA7XG5cdFx0XHR2YXIgbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSAwO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3kgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9ICcnO1xuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxzX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQgKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuZmxpcHBlZF9pdGVtcywgJCh0aGlzKSApLndyYXBBbGwoICc8ZGl2IGNsYXNzPVwiZmxpcHBlclwiLz4nICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCh0aGlzKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0XHRpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBmcmVxdWVuY3kgPT0gMSApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQteWVhcmx5JyApICk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3kgPT0gMTIgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LW1vbnRobHknICkgKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXG5cdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHR0aGF0LmNoYW5nZUZyZXF1ZW5jeSggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJCggb3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IsIGVsZW1lbnQpLnRleHQoZnJlcXVlbmN5X25hbWUpO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkudmFsKCk7XG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGF0LmNoYW5nZUFtb3VudFByZXZpZXcoIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKS5wYXJlbnQoKSApLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGxldmVsRmxpcHBlclxuXG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlICk7XG5cblx0XHRcdCQoJ2gyJywgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWxbJ25hbWUnXSApIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQodGhpcykucGFyZW50KCkucGFyZW50KCkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRjaGFuZ2VGcmVxdWVuY3k6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdFx0dmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0XHR2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdHZhciBmcmVxdWVuY3kgICAgICA9IHBhcnNlSW50KCBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMV0gKTtcblxuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS52YWwoIHNlbGVjdGVkICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnByb3AoICdzZWxlY3RlZCcsIHNlbGVjdGVkICk7XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkuZGF0YSggJ2ZyZXF1ZW5jeScsIGZyZXF1ZW5jeSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUZyZXF1ZW5jeVxuXG5cdFx0Y2hhbmdlQW1vdW50UHJldmlldzogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0XHR2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHRcdHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUFtb3VudFByZXZpZXdcblxuXHRcdHN0YXJ0TGV2ZWxDbGljazogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCcuc3RhcnQtbGV2ZWwnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGxldmVsX2NsYXNzID0gJCggdGhpcyApLnByb3AoICdjbGFzcycgKTtcblx0XHRcdFx0dmFyIGxldmVsX251bWJlciA9IGxldmVsX2NsYXNzW2xldmVsX2NsYXNzLmxlbmd0aCAtMV07XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyLCBlbGVtZW50ICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciArICcgJyArIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwICk7XG4iLCIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50ICkge1xuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RUcmFja1N1Ym1pdCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdHR5cGU6ICdldmVudCcsXG5cdFx0Y2F0ZWdvcnk6ICdTdXBwb3J0IFVzJyxcblx0XHRhY3Rpb246ICdCZWNvbWUgQSBNZW1iZXInLFxuXHRcdGxhYmVsOiBsb2NhdGlvbi5wYXRobmFtZVxuXHR9O1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG5cblx0XHRcdCQoIHRoaXMuZWxlbWVudCApLnN1Ym1pdCggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHR0aGF0LmFuYWx5dGljc0V2ZW50VHJhY2soXG5cdFx0XHRcdFx0b3B0aW9ucy50eXBlLFxuXHRcdFx0XHRcdG9wdGlvbnMuY2F0ZWdvcnksXG5cdFx0XHRcdFx0b3B0aW9ucy5hY3Rpb24sXG5cdFx0XHRcdFx0b3B0aW9ucy5sYWJlbFxuXHRcdFx0XHQpO1xuXHRcdFx0XHQvLyBhbHNvIGJ1YmJsZXMgdGhlIGV2ZW50IHVwIHRvIHN1Ym1pdCB0aGUgZm9ybVxuXHRcdFx0fSk7XG5cdFx0fSxcblxuXHRcdGFuYWx5dGljc0V2ZW50VHJhY2s6IGZ1bmN0aW9uKCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKSB7XG5cdFx0XHRpZiAoIHR5cGVvZiBnYSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApO1xuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NFdmVudFRyYWNrXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQgKTtcbiJdfQ==
