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
      var level = {
        'yearlyAmount': thisyear
      };

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
    customAmountFrequency: '#amount-item .a-frequency-text-label',
    levelViewer: '.a-show-level',
    levelName: '.a-level',
    userCurrentLevel: '.a-current-level',
    declineBenefits: '.m-decline-benefits-select input[type="radio"]',
    giftSelectionGroup: '.m-membership-gift-selector',
    swagEligibilityText: '.m-membership-gift-selector .swag-eligibility',
    swagSelector: '.m-select-swag input[type="radio"]',
    swagLabels: '.m-select-swag input[type="radio"] + label',
    subscriptionsSelector: '.m-select-subscription input[type="radio"]',
    subscriptionsLabels: '.m-select-subscription input[type="radio"] + label',
    minAmounts: '.m-membership-gift-selector .min-amount',
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
      } // setup Analytics Enhanced Ecommerce plugin


      if (typeof ga !== 'undefined') {
        ga('require', 'ec');
      } // Set up the UI for the current field state on (re-)load


      this.setAmountLabels($frequency.filter(':checked').val());
      this.setMinAmounts($frequency.filter(':checked').val());
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
    // step is the integer for the step in the ecommerce process.
    // for this purpose, it's probably always 1.
    // things we need to know: the level name, the amount, and the frequency
    // example:

    /*
    Running command: ga("ec:addProduct", {id: "minnpost_silver_membership", name: "MinnPost Silver Membership", category: "Donation", brand: "MinnPost", variant: "Monthly", price: "5", quantity: 1})
    */
    analyticsTracker: function analyticsTracker(level, amount, frequency_label) {
      if (typeof ga !== 'undefined') {
        ga('ec:addProduct', {
          'id': 'minnpost_' + level.toLowerCase() + '_membership',
          'name': 'MinnPost ' + level.charAt(0).toUpperCase() + level.slice(1) + ' Membership',
          'category': 'Donation',
          'brand': 'MinnPost',
          'variant': frequency_label,
          'price': amount,
          'quantity': 1
        });
      } else {
        return;
      }
    },
    // end analyticsTracker
    onFrequencyChange: function onFrequencyChange(event) {
      this.setAmountLabels($(event.target).val());
      this.setMinAmounts($(event.target).val());
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
      var $giftSelectionGroup = $(this.element).find(this.options.giftSelectionGroup);
      var decline = $(this.element).find(this.options.declineBenefits).filter(':checked').val();

      if (decline === 'true') {
        $giftSelectionGroup.hide();
        return;
      }

      $giftSelectionGroup.show();
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
      var $customAmountFrequency = $(this.options.customAmountFrequency);
      $groups.removeClass('active');
      $groups.filter('[data-frequency="' + frequencyString + '"]').addClass('active');
      $selected.prop('checked', false);
      $groups.filter('.active').find('input[type="radio"][data-index="' + index + '"]').prop('checked', true);
      var currentFrequencyLabel = $groups.filter('.active').find('.a-frequency-text-label').first().text();
      $customAmountFrequency.text(currentFrequencyLabel);
    },
    // end setAmountLabels
    setMinAmounts: function setMinAmounts(frequencyString) {
      var $elements = $(this.options.minAmounts);
      $elements.removeClass('active');
      $elements.filter('[data-frequency="' + frequencyString + '"]').addClass('active');
    },
    // end setMinAmounts
    checkAndSetLevel: function checkAndSetLevel() {
      var amount = $(this.options.amountSelector).filter(':checked').val();

      if (typeof amount === 'undefined') {
        amount = $(this.options.amountField).val();
      }

      var frequency_string = $(this.options.frequencySelector + ':checked').val();
      var frequency = frequency_string.split(' - ')[1];
      var frequency_name = frequency_string.split(' - ')[0];
      var frequency_id = $(this.options.frequencySelector + ':checked').prop('id');
      var frequency_label = $('label[for="' + frequency_id + '"]').text();
      var level = MinnPostMembership.checkLevel(amount, frequency, frequency_name);
      this.showNewLevel(this.element, this.options, level);
      this.setEnabledGifts(level);
      this.analyticsTracker(level['name'], amount, frequency_label);
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
    },
    // end showNewLevel
    setEnabledGifts: function setEnabledGifts(level) {
      var setEnabled = function setEnabled() {
        $(this).prop('disabled', level.yearlyAmount < $(this).data('minYearlyAmount'));
      };

      $(this.options.swagSelector).each(setEnabled);
      $(this.options.subscriptionsSelector).each(setEnabled);

      if ($(this.options.swagSelector).not('#swag-decline').is(':enabled')) {
        $('.swag-disabled').removeClass('active');
        $('.swag-enabled').addClass('active');
      } else {
        $('.swag-disabled').addClass('active');
        $('.swag-enabled').removeClass('active');
      }
    } // end setEnabledGifts

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
        // this tracks an event submission based on the plugin options
        // it also bubbles the event up to submit the form
        that.analyticsEventTrack(options.type, options.category, options.action, options.label); // if this is the main checkout form, send it to the ec plugin as a checkout

        that.analyticsEcommerceTrack($(that.element));
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
    },
    // end analyticsEventTrack
    analyticsEcommerceTrack: function analyticsEcommerceTrack(element) {
      if (typeof ga === 'undefined') {
        return;
      }

      ga('require', 'ec');

      if (element.hasClass('m-form-membership-support')) {
        ga('ec:setAction', 'checkout', {
          'step': 1
        });
      }
    } // end analyticsEcommerceTrack

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIiwidHJhY2stc3VibWl0LmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsIm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCIkIiwiZG9jdW1lbnQiLCJwbHVnaW5OYW1lIiwiZGVmYXVsdHMiLCJmcmVxdWVuY3lTZWxlY3RvciIsImFtb3VudEdyb3VwIiwiYW1vdW50U2VsZWN0b3IiLCJhbW91bnRMYWJlbHMiLCJhbW91bnRWYWx1ZSIsImFtb3VudERlc2NyaXB0aW9uIiwiYW1vdW50RmllbGQiLCJjdXN0b21BbW91bnRGcmVxdWVuY3kiLCJsZXZlbFZpZXdlciIsImxldmVsTmFtZSIsInVzZXJDdXJyZW50TGV2ZWwiLCJkZWNsaW5lQmVuZWZpdHMiLCJnaWZ0U2VsZWN0aW9uR3JvdXAiLCJzd2FnRWxpZ2liaWxpdHlUZXh0Iiwic3dhZ1NlbGVjdG9yIiwic3dhZ0xhYmVscyIsInN1YnNjcmlwdGlvbnNTZWxlY3RvciIsInN1YnNjcmlwdGlvbnNMYWJlbHMiLCJtaW5BbW91bnRzIiwiZGVjbGluZVN1YnNjcmlwdGlvbnMiLCJQbHVnaW4iLCJlbGVtZW50Iiwib3B0aW9ucyIsImV4dGVuZCIsIl9kZWZhdWx0cyIsIl9uYW1lIiwiaW5pdCIsIiRmcmVxdWVuY3kiLCJmaW5kIiwiJHN1Z2dlc3RlZEFtb3VudCIsIiRhbW91bnQiLCIkZGVjbGluZUJlbmVmaXRzIiwiJHN1YnNjcmlwdGlvbnMiLCJsZW5ndGgiLCJnYSIsInNldEFtb3VudExhYmVscyIsImZpbHRlciIsInZhbCIsInNldE1pbkFtb3VudHMiLCJjaGVja0FuZFNldExldmVsIiwib24iLCJvbkZyZXF1ZW5jeUNoYW5nZSIsImJpbmQiLCJvblN1Z2dlc3RlZEFtb3VudENoYW5nZSIsIm9uQW1vdW50Q2hhbmdlIiwibm90IiwiaXMiLCJwcm9wIiwib25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UiLCJvblN1YnNjcmlwdGlvbnNDbGljayIsImFuYWx5dGljc1RyYWNrZXIiLCJmcmVxdWVuY3lfbGFiZWwiLCJ0b0xvd2VyQ2FzZSIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJldmVudCIsInRhcmdldCIsImNsZWFyQW1vdW50U2VsZWN0b3IiLCIkdGFyZ2V0IiwiJGdpZnRTZWxlY3Rpb25Hcm91cCIsImRlY2xpbmUiLCJoaWRlIiwic2hvdyIsIiRkZWNsaW5lIiwiZnJlcXVlbmN5U3RyaW5nIiwiJGdyb3VwcyIsIiRzZWxlY3RlZCIsImluZGV4IiwiJGN1c3RvbUFtb3VudEZyZXF1ZW5jeSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJjdXJyZW50RnJlcXVlbmN5TGFiZWwiLCJmaXJzdCIsInRleHQiLCIkZWxlbWVudHMiLCJmcmVxdWVuY3lfc3RyaW5nIiwic3BsaXQiLCJmcmVxdWVuY3lfbmFtZSIsImZyZXF1ZW5jeV9pZCIsInNob3dOZXdMZXZlbCIsInNldEVuYWJsZWRHaWZ0cyIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbFZpZXdlckNvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJyZXBsYWNlIiwibWF0Y2giLCJkZWMiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJtZW1iZXJfbGV2ZWwiLCJodG1sIiwic2V0RW5hYmxlZCIsInllYXJseUFtb3VudCIsImVhY2giLCJmbiIsImpRdWVyeSIsImJlbmVmaXRGb3JtIiwicGVyZm9ybWFuY2UiLCJuYXZpZ2F0aW9uIiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZW1vdmVBdHRyIiwiY2xpY2siLCJwcmV2ZW50RGVmYXVsdCIsIiRidXR0b24iLCIkc3RhdHVzIiwicGFyZW50IiwiJHNlbGVjdCIsImJlbmVmaXRUeXBlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJidXR0b25fdmFsdWUiLCJidXR0b25fbGFiZWwiLCJidXR0b25fY2xhc3MiLCJidXR0b25fYXR0ciIsIm1lc3NhZ2UiLCJtZXNzYWdlX2NsYXNzIiwiYXR0ciIsInJlbW92ZV9pbnN0YW5jZV92YWx1ZSIsImkiLCJyZW1vdmUiLCJyZWFkeSIsIm1wX21lbWJlcnNoaXBfYW5hbHl0aWNzX3RyYWNraW5nX2V2ZW50IiwiY2F0ZWdvcnkiLCJhY3Rpb24iLCJsYWJlbCIsInZhbHVlIiwicGF0aG5hbWUiLCJ1bmRlZmluZWQiLCJyZXNldCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwiZSIsImhvc3RuYW1lIiwiaGFzaCIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwibGV2ZWxfbnVtYmVyIiwibGV2ZWxzX2NvbnRhaW5lciIsInNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yIiwiZmxpcHBlZF9pdGVtcyIsIndyYXBBbGwiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsImNsb3Nlc3QiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwiY2hhbmdlQW1vdW50UHJldmlldyIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyIsInN1Ym1pdCIsImFuYWx5dGljc0V2ZW50VHJhY2siLCJhbmFseXRpY3NFY29tbWVyY2VUcmFjayIsImhhc0NsYXNzIl0sIm1hcHBpbmdzIjoiOztBQUFBOztBQUFDLENBQUMsVUFBV0EsTUFBWCxFQUFvQjtBQUNyQixXQUFTQyxrQkFBVCxDQUE2QkMsSUFBN0IsRUFBbUNDLFFBQW5DLEVBQThDO0FBQzdDLFNBQUtELElBQUwsR0FBWSxFQUFaOztBQUNBLFFBQUksT0FBT0EsSUFBUCxLQUFnQixXQUFwQixFQUFpQztBQUNoQyxXQUFLQSxJQUFMLEdBQVlBLElBQVo7QUFDQTs7QUFFRCxTQUFLQyxRQUFMLEdBQWdCLEVBQWhCOztBQUNBLFFBQUksT0FBT0EsUUFBUCxLQUFvQixXQUF4QixFQUFxQztBQUNwQyxXQUFLQSxRQUFMLEdBQWdCQSxRQUFoQjtBQUNBOztBQUVELFNBQUtDLGNBQUwsR0FBc0IsRUFBdEI7O0FBQ0EsUUFBSyxPQUFPLEtBQUtGLElBQUwsQ0FBVUcsWUFBakIsS0FBa0MsV0FBbEMsSUFDQSxPQUFPLEtBQUtILElBQUwsQ0FBVUcsWUFBVixDQUF1QkMsZUFBOUIsS0FBa0QsV0FEdkQsRUFDcUU7QUFDcEUsV0FBS0YsY0FBTCxHQUFzQixLQUFLRixJQUFMLENBQVVHLFlBQVYsQ0FBdUJDLGVBQTdDO0FBQ0E7QUFDRDs7QUFFREwsRUFBQUEsa0JBQWtCLENBQUNNLFNBQW5CLEdBQStCO0FBQzlCQyxJQUFBQSxVQUFVLEVBQUUsb0JBQVVDLE1BQVYsRUFBa0JDLFNBQWxCLEVBQTZCQyxJQUE3QixFQUFvQztBQUMvQyxVQUFJQyxRQUFRLEdBQUdDLFFBQVEsQ0FBRUosTUFBRixDQUFSLEdBQXFCSSxRQUFRLENBQUVI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WXlCLFVBQTFCLENBQVAsRUFBZ0Q7QUFDL0NGLFFBQUFBLENBQUMsQ0FBQ3ZCLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXlCLFVBQTFCLEVBQXNDLElBQUlzQixNQUFKLENBQVksSUFBWixFQUFrQkUsT0FBbEIsQ0FBdEM7QUFDQTtBQUNELEtBSk0sQ0FBUDtBQUtBLEdBTkQ7QUFPQSxDQWxGQSxFQWtGRzRFLE1BbEZILEVBa0ZXL0gsTUFsRlgsRUFrRm1CMEIsUUFsRm5CIiwiZmlsZSI6Im1pbm5wb3N0LW1lbWJlcnNoaXAtZnJvbnQtZW5kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiOyhmdW5jdGlvbiAoIHdpbmRvdyApIHtcblx0ZnVuY3Rpb24gTWlublBvc3RNZW1iZXJzaGlwKCBkYXRhLCBzZXR0aW5ncyApIHtcblx0XHR0aGlzLmRhdGEgPSB7fTtcblx0XHRpZiAodHlwZW9mIGRhdGEgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aGlzLmRhdGEgPSBkYXRhO1xuXHRcdH1cblxuXHRcdHRoaXMuc2V0dGluZ3MgPSB7fTtcblx0XHRpZiAodHlwZW9mIHNldHRpbmdzICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuXHRcdH1cblxuXHRcdHRoaXMucHJldmlvdXNBbW91bnQgPSAnJztcblx0XHRpZiAoIHR5cGVvZiB0aGlzLmRhdGEuY3VycmVudF91c2VyICE9PSAndW5kZWZpbmVkJyAmJlxuXHRcdCAgICAgdHlwZW9mIHRoaXMuZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50ICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQgPSB0aGlzLmRhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudDtcblx0XHR9XG5cdH1cblxuXHRNaW5uUG9zdE1lbWJlcnNoaXAucHJvdG90eXBlID0ge1xuXHRcdGNoZWNrTGV2ZWw6IGZ1bmN0aW9uKCBhbW91bnQsIGZyZXF1ZW5jeSwgdHlwZSApIHtcblx0XHRcdHZhciB0aGlzeWVhciA9IHBhcnNlSW50KCBhbW91bnQgKSAqIHBhcnNlSW50KCBmcmVxdWVuY3kgKTtcblx0XHRcdGlmICggdHlwZW9mIHRoaXMucHJldmlvdXNBbW91bnQgIT09ICd1bmRlZmluZWQnICYmIHRoaXMucHJldmlvdXNBbW91bnQgIT09ICcnICkge1xuXHRcdFx0XHR2YXIgcHJpb3JfeWVhcl9hbW91bnQgPSBwYXJzZUludCggdGhpcy5wcmV2aW91c0Ftb3VudC5wcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMsIDEwICk7XG5cdFx0XHRcdHZhciBjb21pbmdfeWVhcl9hbW91bnQgPSBwYXJzZUludCggdGhpcy5wcmV2aW91c0Ftb3VudC5jb21pbmdfeWVhcl9jb250cmlidXRpb25zLCAxMCApO1xuXHRcdFx0XHR2YXIgYW5udWFsX3JlY3VycmluZ19hbW91bnQgPSBwYXJzZUludCggdGhpcy5wcmV2aW91c0Ftb3VudC5hbm51YWxfcmVjdXJyaW5nX2Ftb3VudCwgMTAgKTtcblx0XHRcdFx0Ly8gY2FsY3VsYXRlIG1lbWJlciBsZXZlbCBmb3JtdWxhXG5cdFx0XHRcdGlmICggdHlwZSA9PT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRwcmlvcl95ZWFyX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXN5ZWFyID0gTWF0aC5tYXgoIHByaW9yX3llYXJfYW1vdW50LCBjb21pbmdfeWVhcl9hbW91bnQsIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB0aGlzLmdldExldmVsKCB0aGlzeWVhciApO1xuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRnZXRMZXZlbDogZnVuY3Rpb24oIHRoaXN5ZWFyICkge1xuXHRcdFx0dmFyIGxldmVsID0ge1xuXHRcdFx0XHQneWVhcmx5QW1vdW50JzogdGhpc3llYXJcblx0XHRcdH07XG5cdFx0XHRpZiAoIHRoaXN5ZWFyID4gMCAmJiB0aGlzeWVhciA8IDYwICkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0Jyb256ZSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDE7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0aGlzeWVhciA+IDU5ICYmIHRoaXN5ZWFyIDwgMTIwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnU2lsdmVyJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMjtcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAxMTkgJiYgdGhpc3llYXIgPCAyNDApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdHb2xkJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMztcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAyMzkpIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdQbGF0aW51bSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGdldExldmVsXG5cdH07XG5cblx0d2luZG93Lk1pbm5Qb3N0TWVtYmVyc2hpcCA9IG5ldyBNaW5uUG9zdE1lbWJlcnNoaXAoXG5cdFx0d2luZG93Lm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSxcblx0XHR3aW5kb3cubWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5nc1xuXHQpO1xufSkoIHdpbmRvdyApO1xuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwICkge1xuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RBbW91bnRTZWxlY3QnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHRmcmVxdWVuY3lTZWxlY3RvcjogJy5tLWZyZXF1ZW5jeS1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRhbW91bnRHcm91cDogJy5tLWZyZXF1ZW5jeS1ncm91cCcsXG5cdFx0YW1vdW50U2VsZWN0b3I6ICcubS1hbW91bnQtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0YW1vdW50TGFiZWxzOiAnLm0tYW1vdW50LXNlbGVjdCBsYWJlbCcsXG5cdFx0YW1vdW50VmFsdWU6ICdzdHJvbmcnLFxuXHRcdGFtb3VudERlc2NyaXB0aW9uOiAnLmEtYW1vdW50LWRlc2NyaXB0aW9uJyxcblx0XHRhbW91bnRGaWVsZDogJy5hLWFtb3VudC1maWVsZCAjYW1vdW50Jyxcblx0XHRjdXN0b21BbW91bnRGcmVxdWVuY3k6ICcjYW1vdW50LWl0ZW0gLmEtZnJlcXVlbmN5LXRleHQtbGFiZWwnLFxuXHRcdGxldmVsVmlld2VyOiAnLmEtc2hvdy1sZXZlbCcsXG5cdFx0bGV2ZWxOYW1lOiAnLmEtbGV2ZWwnLFxuXHRcdHVzZXJDdXJyZW50TGV2ZWw6ICcuYS1jdXJyZW50LWxldmVsJyxcblx0XHRkZWNsaW5lQmVuZWZpdHM6ICcubS1kZWNsaW5lLWJlbmVmaXRzLXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGdpZnRTZWxlY3Rpb25Hcm91cDogJy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvcicsXG5cdFx0c3dhZ0VsaWdpYmlsaXR5VGV4dDogJy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvciAuc3dhZy1lbGlnaWJpbGl0eScsXG5cdFx0c3dhZ1NlbGVjdG9yOiAnLm0tc2VsZWN0LXN3YWcgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRzd2FnTGFiZWxzOiAnLm0tc2VsZWN0LXN3YWcgaW5wdXRbdHlwZT1cInJhZGlvXCJdICsgbGFiZWwnLFxuXHRcdHN1YnNjcmlwdGlvbnNTZWxlY3RvcjogJy5tLXNlbGVjdC1zdWJzY3JpcHRpb24gaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRzdWJzY3JpcHRpb25zTGFiZWxzOiAnLm0tc2VsZWN0LXN1YnNjcmlwdGlvbiBpbnB1dFt0eXBlPVwicmFkaW9cIl0gKyBsYWJlbCcsXG5cdFx0bWluQW1vdW50czogJy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvciAubWluLWFtb3VudCcsXG5cdFx0ZGVjbGluZVN1YnNjcmlwdGlvbnM6ICcjc3Vic2NyaXB0aW9uLWRlY2xpbmUnXG5cdH07XG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblx0XHRpbml0OiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciAkZnJlcXVlbmN5ID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICk7XG5cdFx0XHR2YXIgJHN1Z2dlc3RlZEFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApO1xuXHRcdFx0dmFyICRhbW91bnQgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQgKTtcblx0XHRcdHZhciAkZGVjbGluZUJlbmVmaXRzID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVCZW5lZml0cyApO1xuXHRcdFx0dmFyICRzdWJzY3JpcHRpb25zID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLnN1YnNjcmlwdGlvbnNTZWxlY3RvciApO1xuXHRcdFx0aWYgKCAhKCAkYW1vdW50Lmxlbmd0aCA+IDAgJiZcblx0XHRcdCAgICAgICAgJGZyZXF1ZW5jeS5sZW5ndGggPiAwICYmXG5cdFx0XHQgICAgICAgICRzdWdnZXN0ZWRBbW91bnQubGVuZ3RoID4gMCApICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIHNldHVwIEFuYWx5dGljcyBFbmhhbmNlZCBFY29tbWVyY2UgcGx1Z2luXG5cdFx0XHRpZiAoIHR5cGVvZiBnYSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGdhKCAncmVxdWlyZScsICdlYycgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2V0IHVwIHRoZSBVSSBmb3IgdGhlIGN1cnJlbnQgZmllbGQgc3RhdGUgb24gKHJlLSlsb2FkXG5cdFx0XHR0aGlzLnNldEFtb3VudExhYmVscyggJGZyZXF1ZW5jeS5maWx0ZXIoJzpjaGVja2VkJykudmFsKCkgKTtcblx0XHRcdHRoaXMuc2V0TWluQW1vdW50cyggJGZyZXF1ZW5jeS5maWx0ZXIoJzpjaGVja2VkJykudmFsKCkgKTtcblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCgpO1xuXG5cdFx0XHQkZnJlcXVlbmN5Lm9uKCAnY2hhbmdlJywgdGhpcy5vbkZyZXF1ZW5jeUNoYW5nZS5iaW5kKHRoaXMpICk7XG5cdFx0XHQkc3VnZ2VzdGVkQW1vdW50Lm9uKCAnY2hhbmdlJywgdGhpcy5vblN1Z2dlc3RlZEFtb3VudENoYW5nZS5iaW5kKHRoaXMpICk7XG5cdFx0XHQkYW1vdW50Lm9uKCAna2V5dXAgbW91c2V1cCcsIHRoaXMub25BbW91bnRDaGFuZ2UuYmluZCh0aGlzKSApO1xuXG5cdFx0XHRpZiAoICEgKCAkZGVjbGluZUJlbmVmaXRzLmxlbmd0aCA+IDAgJiYgJHN1YnNjcmlwdGlvbnMubGVuZ3RoID4gMCApICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNldCB1cCB0aGUgVUkgZm9yIHRoZSBjdXJyZW50IGZpZWxkIHN0YXRlIG9uIChyZS0pbG9hZFxuXHRcdFx0aWYgKCAkc3Vic2NyaXB0aW9ucy5ub3QoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHRcdCQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHRcdH1cblx0XHRcdHRoaXMub25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UoKTtcblxuXHRcdFx0JGRlY2xpbmVCZW5lZml0cy5vbiggJ2NoYW5nZScsIHRoaXMub25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UuYmluZCggdGhpcyApICk7XG5cdFx0XHQkc3Vic2NyaXB0aW9ucy5vbiggJ2NsaWNrJywgdGhpcy5vblN1YnNjcmlwdGlvbnNDbGljay5iaW5kKCB0aGlzICkgKTtcblx0XHR9LCAvLyBlbmQgaW5pdFxuXG5cdFx0IC8vIHN0ZXAgaXMgdGhlIGludGVnZXIgZm9yIHRoZSBzdGVwIGluIHRoZSBlY29tbWVyY2UgcHJvY2Vzcy5cblx0XHQgLy8gZm9yIHRoaXMgcHVycG9zZSwgaXQncyBwcm9iYWJseSBhbHdheXMgMS5cblx0XHQgLy8gdGhpbmdzIHdlIG5lZWQgdG8ga25vdzogdGhlIGxldmVsIG5hbWUsIHRoZSBhbW91bnQsIGFuZCB0aGUgZnJlcXVlbmN5XG5cdFx0IC8vIGV4YW1wbGU6XG5cdFx0IC8qXG5cdFx0IFJ1bm5pbmcgY29tbWFuZDogZ2EoXCJlYzphZGRQcm9kdWN0XCIsIHtpZDogXCJtaW5ucG9zdF9zaWx2ZXJfbWVtYmVyc2hpcFwiLCBuYW1lOiBcIk1pbm5Qb3N0IFNpbHZlciBNZW1iZXJzaGlwXCIsIGNhdGVnb3J5OiBcIkRvbmF0aW9uXCIsIGJyYW5kOiBcIk1pbm5Qb3N0XCIsIHZhcmlhbnQ6IFwiTW9udGhseVwiLCBwcmljZTogXCI1XCIsIHF1YW50aXR5OiAxfSlcblx0XHQgKi9cblx0XHRhbmFseXRpY3NUcmFja2VyOiBmdW5jdGlvbiggbGV2ZWwsIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgZ2EgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRnYSggJ2VjOmFkZFByb2R1Y3QnLCB7XG5cdFx0XHRcdFx0J2lkJzogJ21pbm5wb3N0XycgKyBsZXZlbC50b0xvd2VyQ2FzZSgpICsgJ19tZW1iZXJzaGlwJyxcblx0XHRcdFx0XHQnbmFtZSc6ICdNaW5uUG9zdCAnICsgbGV2ZWwuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBsZXZlbC5zbGljZSgxKSArICcgTWVtYmVyc2hpcCcsXG5cdFx0XHRcdFx0J2NhdGVnb3J5JzogJ0RvbmF0aW9uJyxcblx0XHRcdFx0XHQnYnJhbmQnOiAnTWlublBvc3QnLFxuXHRcdFx0XHRcdCd2YXJpYW50JzogIGZyZXF1ZW5jeV9sYWJlbCxcblx0XHRcdFx0XHQncHJpY2UnOiBhbW91bnQsXG5cdFx0XHRcdFx0J3F1YW50aXR5JzogMVxuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzVHJhY2tlclxuXG5cdFx0b25GcmVxdWVuY3lDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMuc2V0QW1vdW50TGFiZWxzKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSApO1xuXHRcdFx0dGhpcy5zZXRNaW5BbW91bnRzKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSApO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCk7XG5cdFx0fSwgLy8gZW5kIG9uRnJlcXVlbmN5Q2hhbmdlXG5cblx0XHRvblN1Z2dlc3RlZEFtb3VudENoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0JCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICkudmFsKCBudWxsICk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoKTtcblx0XHR9LCAvLyBlbmQgb25TdWdnZXN0ZWRBbW91bnRDaGFuZ2VcblxuXHRcdG9uQW1vdW50Q2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR0aGlzLmNsZWFyQW1vdW50U2VsZWN0b3IoIGV2ZW50ICk7XG5cblx0XHRcdHZhciAkdGFyZ2V0ID0gJCggZXZlbnQudGFyZ2V0ICk7XG5cdFx0XHRpZiAoICR0YXJnZXQuZGF0YSggJ2xhc3QtdmFsdWUnICkgIT0gJHRhcmdldC52YWwoKSApIHtcblx0XHRcdFx0JHRhcmdldC5kYXRhKCAnbGFzdC12YWx1ZScsICR0YXJnZXQudmFsKCkgKTtcblx0XHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIG9uQW1vdW50Q2hhbmdlXG5cblx0XHRvbkRlY2xpbmVCZW5lZml0c0NoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyICRnaWZ0U2VsZWN0aW9uR3JvdXAgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZ2lmdFNlbGVjdGlvbkdyb3VwICk7XG5cdFx0XHR2YXIgZGVjbGluZSA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lQmVuZWZpdHMgKS5maWx0ZXIoICc6Y2hlY2tlZCcgKS52YWwoKTtcblxuXHRcdFx0aWYgKCBkZWNsaW5lID09PSAndHJ1ZScgKSB7XG5cdFx0XHRcdCRnaWZ0U2VsZWN0aW9uR3JvdXAuaGlkZSgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRnaWZ0U2VsZWN0aW9uR3JvdXAuc2hvdygpO1xuXHRcdH0sIC8vIGVuZCBvbkRlY2xpbmVCZW5lZml0c0NoYW5nZVxuXG5cdFx0b25TdWJzY3JpcHRpb25zQ2xpY2s6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciAkc3Vic2NyaXB0aW9ucyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5zdWJzY3JpcHRpb25zU2VsZWN0b3IgKS5ub3QoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApO1xuXHRcdFx0dmFyICRkZWNsaW5lID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVTdWJzY3JpcHRpb25zICk7XG5cblx0XHRcdGlmICggJCggZXZlbnQudGFyZ2V0ICkuaXMoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApICkge1xuXHRcdFx0XHQkc3Vic2NyaXB0aW9ucy5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JGRlY2xpbmUucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdH0sIC8vIGVuZCBvblN1YnNjcmlwdGlvbnNDaGFuZ2VcblxuXHRcdGNsZWFyQW1vdW50U2VsZWN0b3I6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciAkc3VnZ2VzdGVkQW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yICk7XG5cblx0XHRcdGlmICggJCggZXZlbnQudGFyZ2V0ICkudmFsKCkgPT09ICcnICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRzdWdnZXN0ZWRBbW91bnQucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdH0sIC8vIGVuZCBjbGVhckFtb3VudFNlbGVjdG9yXG5cblx0XHRzZXRBbW91bnRMYWJlbHM6IGZ1bmN0aW9uKCBmcmVxdWVuY3lTdHJpbmcgKSB7XG5cdFx0XHR2YXIgJGdyb3VwcyA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRHcm91cCApO1xuXHRcdFx0dmFyICRzZWxlY3RlZCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApXG5cdFx0XHQgICAgLmZpbHRlciggJzpjaGVja2VkJyApO1xuXHRcdFx0dmFyIGluZGV4ID0gJHNlbGVjdGVkLmRhdGEoICdpbmRleCcgKTtcblx0XHRcdHZhciAkY3VzdG9tQW1vdW50RnJlcXVlbmN5ID0gJCggdGhpcy5vcHRpb25zLmN1c3RvbUFtb3VudEZyZXF1ZW5jeSApO1xuXG5cdFx0XHQkZ3JvdXBzLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0JGdyb3Vwcy5maWx0ZXIoICdbZGF0YS1mcmVxdWVuY3k9XCInICsgZnJlcXVlbmN5U3RyaW5nICsgJ1wiXScgKVxuXHRcdFx0XHQuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQkc2VsZWN0ZWQucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdFx0JGdyb3Vwcy5maWx0ZXIoICcuYWN0aXZlJyApXG5cdFx0XHRcdC5maW5kKCAnaW5wdXRbdHlwZT1cInJhZGlvXCJdW2RhdGEtaW5kZXg9XCInICsgaW5kZXggKyAnXCJdJyApXG5cdFx0XHRcdC5wcm9wKCAnY2hlY2tlZCcsIHRydWUgKTtcblxuXHRcdFx0dmFyIGN1cnJlbnRGcmVxdWVuY3lMYWJlbCA9ICRncm91cHMuZmlsdGVyKCAnLmFjdGl2ZScgKS5maW5kKCcuYS1mcmVxdWVuY3ktdGV4dC1sYWJlbCcpLmZpcnN0KCkudGV4dCgpO1xuXHRcdFx0JGN1c3RvbUFtb3VudEZyZXF1ZW5jeS50ZXh0KCBjdXJyZW50RnJlcXVlbmN5TGFiZWwgKTtcblx0XHR9LCAvLyBlbmQgc2V0QW1vdW50TGFiZWxzXG5cblx0XHRzZXRNaW5BbW91bnRzOiBmdW5jdGlvbiggZnJlcXVlbmN5U3RyaW5nICkge1xuXHRcdFx0dmFyICRlbGVtZW50cyA9ICQoIHRoaXMub3B0aW9ucy5taW5BbW91bnRzICk7XG5cdFx0XHQkZWxlbWVudHMucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQkZWxlbWVudHMuZmlsdGVyKCAnW2RhdGEtZnJlcXVlbmN5PVwiJyArIGZyZXF1ZW5jeVN0cmluZyArICdcIl0nIClcblx0XHRcdFx0LmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdH0sIC8vIGVuZCBzZXRNaW5BbW91bnRzXG5cblx0XHRjaGVja0FuZFNldExldmVsOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKS5maWx0ZXIoICc6Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdGlmICggdHlwZW9mIGFtb3VudCA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCApLnZhbCgpO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdHZhciBmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9pZCA9ICQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCcgKS5wcm9wKCAnaWQnICk7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X2xhYmVsID0gJCggJ2xhYmVsW2Zvcj1cIicgKyBmcmVxdWVuY3lfaWQgKyAnXCJdJyApLnRleHQoKTtcblxuXHRcdFx0dmFyIGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSApO1xuXHRcdFx0dGhpcy5zaG93TmV3TGV2ZWwoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zLCBsZXZlbCApO1xuXHRcdFx0dGhpcy5zZXRFbmFibGVkR2lmdHMoIGxldmVsICk7XG5cdFx0XHR0aGlzLmFuYWx5dGljc1RyYWNrZXIoIGxldmVsWyduYW1lJ10sIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsICk7XG5cdFx0fSwgLy8gZW5kIGNoZWNrQW5kU2V0TGV2ZWxcblxuXHRcdHNob3dOZXdMZXZlbDogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICkge1xuXHRcdFx0dmFyIG1lbWJlcl9sZXZlbF9wcmVmaXggPSAnJztcblx0XHRcdHZhciBvbGRfbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbFZpZXdlckNvbnRhaW5lciA9IG9wdGlvbnMubGV2ZWxWaWV3ZXI7IC8vIHRoaXMgc2hvdWxkIGNoYW5nZSB3aGVuIHdlIHJlcGxhY2UgdGhlIHRleHQsIGlmIHRoZXJlIGlzIGEgbGluayBpbnNpZGUgaXRcblx0XHRcdHZhciBkZWNvZGVIdG1sRW50aXR5ID0gZnVuY3Rpb24oIHN0ciApIHtcblx0XHRcdFx0cmV0dXJuIHN0ci5yZXBsYWNlKCAvJiMoXFxkKyk7L2csIGZ1bmN0aW9uKCBtYXRjaCwgZGVjICkge1xuXHRcdFx0XHRcdHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKCBkZWMgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0bWVtYmVyX2xldmVsX3ByZWZpeCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5tZW1iZXJfbGV2ZWxfcHJlZml4O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbFZpZXdlcikucHJvcCggJ2NsYXNzJywgJ2Etc2hvdy1sZXZlbCBhLXNob3ctbGV2ZWwtJyArIGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApO1xuXG5cdFx0XHRcdGlmICggJCggb3B0aW9ucy51c2VyQ3VycmVudExldmVsICkubGVuZ3RoID4gMCAmJiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdFx0aWYgKCAnYScsICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdFx0bGV2ZWxWaWV3ZXJDb250YWluZXIgPSBvcHRpb25zLmxldmVsVmlld2VyICsgJyBhJztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvbGRfbGV2ZWwgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5yZXBsYWNlKCBtZW1iZXJfbGV2ZWxfcHJlZml4LCAnJyApO1xuXG5cdFx0XHRcdFx0aWYgKCBvbGRfbGV2ZWwgIT09IGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApIHtcblx0XHRcdFx0XHRcdCQoIGxldmVsVmlld2VyQ29udGFpbmVyICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmRhdGEoICdjaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggbGV2ZWxWaWV3ZXJDb250YWluZXIgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsVmlld2VyICkuZGF0YSggJ25vdC1jaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxOYW1lLCBvcHRpb25zLmxldmVsVmlld2VyKS50ZXh0KCBsZXZlbFsnbmFtZSddICk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIHNob3dOZXdMZXZlbFxuXG5cdFx0c2V0RW5hYmxlZEdpZnRzOiBmdW5jdGlvbiggbGV2ZWwgKSB7XG5cdFx0XHR2YXIgc2V0RW5hYmxlZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCB0aGlzICkucHJvcCggJ2Rpc2FibGVkJywgbGV2ZWwueWVhcmx5QW1vdW50IDwgJCggdGhpcyApLmRhdGEoICdtaW5ZZWFybHlBbW91bnQnICkgKTtcblx0XHRcdH07XG5cblx0XHRcdCQoIHRoaXMub3B0aW9ucy5zd2FnU2VsZWN0b3IgKS5lYWNoKCBzZXRFbmFibGVkICk7XG5cdFx0XHQkKCB0aGlzLm9wdGlvbnMuc3Vic2NyaXB0aW9uc1NlbGVjdG9yICkuZWFjaCggc2V0RW5hYmxlZCApO1xuXG5cdFx0XHRpZiAoICQoIHRoaXMub3B0aW9ucy5zd2FnU2VsZWN0b3IgKS5ub3QoICcjc3dhZy1kZWNsaW5lJyApLmlzKCAnOmVuYWJsZWQnICkgKSB7XG5cdFx0XHRcdCQoICcuc3dhZy1kaXNhYmxlZCcgKS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0JCggJy5zd2FnLWVuYWJsZWQnICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkKCAnLnN3YWctZGlzYWJsZWQnICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoICcuc3dhZy1lbmFibGVkJyApLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBzZXRFbmFibGVkR2lmdHNcblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwICk7XG4iLCIoIGZ1bmN0aW9uKCAkICkge1xuXG5cdGZ1bmN0aW9uIGJlbmVmaXRGb3JtKCkge1xuXHRcdGlmICggMiA9PT0gcGVyZm9ybWFuY2UubmF2aWdhdGlvbi50eXBlICkge1xuXHRcdFx0bG9jYXRpb24ucmVsb2FkKCB0cnVlICk7XG5cdFx0fVxuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbi5hLWJ1dHRvbi1kaXNhYmxlZCcgKS5yZW1vdmVBdHRyKCAnZGlzYWJsZWQnICk7XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0dmFyICRidXR0b24gID0gJCggdGhpcyApO1xuXHRcdFx0dmFyICRzdGF0dXMgID0gJCggJy5tLWJlbmVmaXQtbWVzc2FnZScsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyICRzZWxlY3QgID0gJCggJ3NlbGVjdCcsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyIHNldHRpbmdzID0gbWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncztcblx0XHRcdC8vIHJlc2V0IHRoZSBtZXNzYWdlIGZvciBjdXJyZW50IHN0YXR1c1xuXHRcdFx0aWYgKCAhICcubS1iZW5lZml0LW1lc3NhZ2Utc3VjY2VzcycgKSB7XG5cdFx0XHRcdCQoICcubS1iZW5lZml0LW1lc3NhZ2UnICkucmVtb3ZlQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlIG0tYmVuZWZpdC1tZXNzYWdlLWVycm9yIG0tYmVuZWZpdC1tZXNzYWdlLWluZm8nICk7XG5cdFx0XHR9XG5cdFx0XHQvLyBzZXQgYnV0dG9uIHRvIHByb2Nlc3Npbmdcblx0XHRcdCRidXR0b24udGV4dCggJ1Byb2Nlc3NpbmcnICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gZGlzYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXG5cdFx0XHQvLyBzZXQgYWpheCBkYXRhXG5cdFx0XHR2YXIgZGF0YSA9IHt9O1xuXHRcdFx0dmFyIGJlbmVmaXRUeXBlID0gJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nICkudmFsKCk7XG5cdFx0XHRpZiAoICdwYXJ0bmVyLW9mZmVycycgPT09IGJlbmVmaXRUeXBlICkge1xuXHRcdFx0XHRkYXRhID0ge1xuXHRcdFx0XHRcdCdhY3Rpb24nIDogJ2JlbmVmaXRfZm9ybV9zdWJtaXQnLFxuXHRcdFx0XHRcdCdtaW5ucG9zdF9tZW1iZXJzaGlwX2JlbmVmaXRfZm9ybV9ub25jZScgOiAkYnV0dG9uLmRhdGEoICdiZW5lZml0LW5vbmNlJyApLFxuXHRcdFx0XHRcdCdjdXJyZW50X3VybCcgOiAkKCAnaW5wdXRbbmFtZT1cImN1cnJlbnRfdXJsXCJdJykudmFsKCksXG5cdFx0XHRcdFx0J2JlbmVmaXQtbmFtZSc6ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJykudmFsKCksXG5cdFx0XHRcdFx0J2luc3RhbmNlX2lkJyA6ICQoICdbbmFtZT1cImluc3RhbmNlLWlkLScgKyAkYnV0dG9uLnZhbCgpICsgJ1wiXScgKS52YWwoKSxcblx0XHRcdFx0XHQncG9zdF9pZCcgOiAkYnV0dG9uLnZhbCgpLFxuXHRcdFx0XHRcdCdpc19hamF4JyA6ICcxJyxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkLnBvc3QoIHNldHRpbmdzLmFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0XHQvLyBzdWNjZXNzXG5cdFx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdFx0XHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHRcdFx0aWYgKCAwIDwgJHNlbGVjdC5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRcdCRzZWxlY3QucHJvcCggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS5hdHRyKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vIGVycm9yXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiByZXNwb25zZS5kYXRhLnJlbW92ZV9pbnN0YW5jZV92YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0JCggJ29wdGlvbicsICRzZWxlY3QgKS5lYWNoKCBmdW5jdGlvbiggaSApIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoICQoIHRoaXMgKS52YWwoKSA9PT0gcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHQkKCB0aGlzICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ly8gcmUtZW5hYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0XHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0XHQkc3RhdHVzLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmFkZENsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzICk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCAwIDwgJCggJy5tLWZvcm0tbWVtYmVyc2hpcC1iZW5lZml0JyApLmxlbmd0aCApIHtcblx0XHRcdGJlbmVmaXRGb3JtKCk7XG5cdFx0fVxuXHR9KTtcblxuXHQkKCAnLmEtcmVmcmVzaC1wYWdlJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRsb2NhdGlvbi5yZWxvYWQoKTtcblx0fSk7XG5cbn0gKSggalF1ZXJ5ICk7XG4iLCIoIGZ1bmN0aW9uKCAkICkge1xuXHRmdW5jdGlvbiBtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCggdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICkge1xuXHRcdGlmICggdHlwZW9mIGdhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdGlmICggdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7IFxuXHRcdCQoICcubS1zdXBwb3J0LWN0YS10b3AgLmEtc3VwcG9ydC1idXR0b24nICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciB2YWx1ZSA9ICcnO1xuXHRcdFx0aWYgKCAkKCAnc3ZnJywgJCggdGhpcyApICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0dmFsdWUgPSAkKCAnc3ZnJywgJCggdGhpcyApICkuYXR0ciggJ3RpdGxlJyApICsgJyAnO1xuXHRcdFx0fVxuXHRcdFx0dmFsdWUgPSB2YWx1ZSArICQoIHRoaXMgKS50ZXh0KCk7XG5cdFx0XHRtcF9tZW1iZXJzaGlwX2FuYWx5dGljc190cmFja2luZ19ldmVudCggJ2V2ZW50JywgJ1N1cHBvcnQgQ1RBIC0gSGVhZGVyJywgJ0NsaWNrOiAnICsgdmFsdWUsIGxvY2F0aW9uLnBhdGhuYW1lICk7XG5cdFx0fSk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwLCB1bmRlZmluZWQgKSB7XG5cblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0TWVtYmVyc2hpcCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdCdkZWJ1ZycgOiBmYWxzZSwgLy8gdGhpcyBjYW4gYmUgc2V0IHRvIHRydWUgb24gcGFnZSBsZXZlbCBvcHRpb25zXG5cdFx0J2Ftb3VudF92aWV3ZXInIDogJy5hbW91bnQgaDMnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYS1mb3JtLWl0ZW0tbWVtYmVyc2hpcC1mcmVxdWVuY3knLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzX3R5cGUnIDogJ3NlbGVjdCcsXG5cdFx0J2xldmVsc19jb250YWluZXInIDogJy5vLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVscycsXG5cdFx0J3NpbmdsZV9sZXZlbF9jb250YWluZXInIDogJy5tLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVsJyxcblx0XHQnc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3InIDogJy5tLW1lbWJlci1sZXZlbC1icmllZicsXG5cdFx0J2ZsaXBwZWRfaXRlbXMnIDogJ2Rpdi5hbW91bnQsIGRpdi5lbnRlcicsXG5cdFx0J2xldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yJyA6ICcuc2hvdy1mcmVxdWVuY3knLFxuXHRcdCdjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmFtb3VudCAuYS1idXR0b24tZmxpcCcsXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5lbnRlciBpbnB1dC5hbW91bnQtZW50cnknLFxuXHR9OyAvLyBlbmQgZGVmYXVsdHNcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cblx0XHRpbml0OiBmdW5jdGlvbiggcmVzZXQsIGFtb3VudCApIHtcblx0XHRcdC8vIFBsYWNlIGluaXRpYWxpemF0aW9uIGxvZ2ljIGhlcmVcblx0XHRcdC8vIFlvdSBhbHJlYWR5IGhhdmUgYWNjZXNzIHRvIHRoZSBET00gZWxlbWVudCBhbmRcblx0XHRcdC8vIHRoZSBvcHRpb25zIHZpYSB0aGUgaW5zdGFuY2UsIGUuZy4gdGhpcy5lbGVtZW50XG5cdFx0XHQvLyBhbmQgdGhpcy5vcHRpb25zXG5cdFx0XHQvLyB5b3UgY2FuIGFkZCBtb3JlIGZ1bmN0aW9ucyBsaWtlIHRoZSBvbmUgYmVsb3cgYW5kXG5cdFx0XHQvLyBjYWxsIHRoZW0gbGlrZSBzbzogdGhpcy55b3VyT3RoZXJGdW5jdGlvbih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucykuXG5cdFx0XHR0aGlzLmNhdGNoSGFzaExpbmtzKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLmxldmVsRmxpcHBlciggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuc3RhcnRMZXZlbENsaWNrKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdH0sXG5cblx0XHRjYXRjaEhhc2hMaW5rczogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCdhW2hyZWYqPVwiI1wiXTpub3QoW2hyZWY9XCIjXCJdKScsIGVsZW1lbnQpLmNsaWNrKGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0dmFyIHRhcmdldCA9ICQoZS50YXJnZXQpO1xuXHRcdFx0XHRpZiAodGFyZ2V0LnBhcmVudCgnLmNvbW1lbnQtdGl0bGUnKS5sZW5ndGggPT0gMCAmJiBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgPT0gdGhpcy5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgJiYgbG9jYXRpb24uaG9zdG5hbWUgPT0gdGhpcy5ob3N0bmFtZSkge1xuXHRcdFx0XHRcdHZhciB0YXJnZXQgPSAkKHRoaXMuaGFzaCk7XG5cdFx0XHRcdFx0dGFyZ2V0ID0gdGFyZ2V0Lmxlbmd0aCA/IHRhcmdldCA6ICQoJ1tuYW1lPScgKyB0aGlzLmhhc2guc2xpY2UoMSkgKyddJyk7XG5cdFx0XHRcdFx0aWYgKHRhcmdldC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdCQoJ2h0bWwsYm9keScpLmFuaW1hdGUoe1xuXHRcdFx0XHRcdFx0XHRzY3JvbGxUb3A6IHRhcmdldC5vZmZzZXQoKS50b3Bcblx0XHRcdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIGNhdGNoTGlua3NcblxuXHRcdGxldmVsRmxpcHBlcjogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgYW1vdW50ID0gMDtcblx0XHRcdHZhciBsZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX251bWJlciA9IDA7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeSA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gJyc7XG5cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbHNfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCApLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5mbGlwcGVkX2l0ZW1zLCAkKHRoaXMpICkud3JhcEFsbCggJzxkaXYgY2xhc3M9XCJmbGlwcGVyXCIvPicgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKHRoaXMpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXG5cdFx0XHRcdFx0XHRpZiAoIGZyZXF1ZW5jeSA9PSAxICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC15ZWFybHknICkgKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeSA9PSAxMiApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQtbW9udGhseScgKSApO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cblx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlRnJlcXVlbmN5KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAkKCBvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciwgZWxlbWVudCkudGV4dChmcmVxdWVuY3lfbmFtZSk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS52YWwoKTtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRoYXQuY2hhbmdlQW1vdW50UHJldmlldyggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpLnBhcmVudCgpICkudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgbGV2ZWxGbGlwcGVyXG5cblx0XHRjaGVja0xldmVsOiBmdW5jdGlvbiggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgbGV2ZWwgPSBNaW5uUG9zdE1lbWJlcnNoaXAuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUgKTtcblxuXHRcdFx0JCgnaDInLCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKCAkKHRoaXMpLnRleHQoKSA9PSBsZXZlbFsnbmFtZSddICkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0JCh0aGlzKS5wYXJlbnQoKS5wYXJlbnQoKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGNoYW5nZUZyZXF1ZW5jeTogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0XHR2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHRcdHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0dmFyIGZyZXF1ZW5jeSAgICAgID0gcGFyc2VJbnQoIHNlbGVjdGVkLnNwbGl0KCcgLSAnKVsxXSApO1xuXG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnZhbCggc2VsZWN0ZWQgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkucHJvcCggJ3NlbGVjdGVkJywgc2VsZWN0ZWQgKTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS5kYXRhKCAnZnJlcXVlbmN5JywgZnJlcXVlbmN5ICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlRnJlcXVlbmN5XG5cblx0XHRjaGFuZ2VBbW91bnRQcmV2aWV3OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHRcdHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdFx0dmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlQW1vdW50UHJldmlld1xuXG5cdFx0c3RhcnRMZXZlbENsaWNrOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJy5zdGFydC1sZXZlbCcpLmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgbGV2ZWxfY2xhc3MgPSAkKCB0aGlzICkucHJvcCggJ2NsYXNzJyApO1xuXHRcdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gbGV2ZWxfY2xhc3NbbGV2ZWxfY2xhc3MubGVuZ3RoIC0xXTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIsIGVsZW1lbnQgKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICsgJyAnICsgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBzdGFydExldmVsQ2xpY2tcblxuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xuXG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXAgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQgKSB7XG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdFRyYWNrU3VibWl0Jyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0dHlwZTogJ2V2ZW50Jyxcblx0XHRjYXRlZ29yeTogJ1N1cHBvcnQgVXMnLFxuXHRcdGFjdGlvbjogJ0JlY29tZSBBIE1lbWJlcicsXG5cdFx0bGFiZWw6IGxvY2F0aW9uLnBhdGhuYW1lXG5cdH07XG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblx0XHRpbml0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgb3B0aW9ucyA9IHRoaXMub3B0aW9ucztcblxuXHRcdFx0JCggdGhpcy5lbGVtZW50ICkuc3VibWl0KCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdC8vIHRoaXMgdHJhY2tzIGFuIGV2ZW50IHN1Ym1pc3Npb24gYmFzZWQgb24gdGhlIHBsdWdpbiBvcHRpb25zXG5cdFx0XHRcdC8vIGl0IGFsc28gYnViYmxlcyB0aGUgZXZlbnQgdXAgdG8gc3VibWl0IHRoZSBmb3JtXG5cdFx0XHRcdHRoYXQuYW5hbHl0aWNzRXZlbnRUcmFjayhcblx0XHRcdFx0XHRvcHRpb25zLnR5cGUsXG5cdFx0XHRcdFx0b3B0aW9ucy5jYXRlZ29yeSxcblx0XHRcdFx0XHRvcHRpb25zLmFjdGlvbixcblx0XHRcdFx0XHRvcHRpb25zLmxhYmVsXG5cdFx0XHRcdCk7XG5cdFx0XHRcdC8vIGlmIHRoaXMgaXMgdGhlIG1haW4gY2hlY2tvdXQgZm9ybSwgc2VuZCBpdCB0byB0aGUgZWMgcGx1Z2luIGFzIGEgY2hlY2tvdXRcblx0XHRcdFx0dGhhdC5hbmFseXRpY3NFY29tbWVyY2VUcmFjayggJCggdGhhdC5lbGVtZW50ICkgKTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cblx0XHRhbmFseXRpY3NFdmVudFRyYWNrOiBmdW5jdGlvbiggdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgZ2EgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmICggdHlwZW9mIHZhbHVlID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwgKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKTtcblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzRXZlbnRUcmFja1xuXG5cdFx0YW5hbHl0aWNzRWNvbW1lcmNlVHJhY2s6IGZ1bmN0aW9uKCBlbGVtZW50ICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgZ2EgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRnYSggJ3JlcXVpcmUnLCAnZWMnICk7XG5cdFx0XHRpZiAoIGVsZW1lbnQuaGFzQ2xhc3MoICdtLWZvcm0tbWVtYmVyc2hpcC1zdXBwb3J0JyApICkge1xuXHRcdFx0XHRnYSggJ2VjOnNldEFjdGlvbicsICdjaGVja291dCcsIHtcblx0XHRcdFx0XHQnc3RlcCc6IDEsXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NFY29tbWVyY2VUcmFja1xuXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQgKTtcbiJdfQ==
