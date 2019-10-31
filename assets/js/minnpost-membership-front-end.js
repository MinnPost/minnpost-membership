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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIiwidHJhY2stc3VibWl0LmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsIm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCIkIiwiZG9jdW1lbnQiLCJwbHVnaW5OYW1lIiwiZGVmYXVsdHMiLCJmcmVxdWVuY3lTZWxlY3RvciIsImFtb3VudEdyb3VwIiwiYW1vdW50U2VsZWN0b3IiLCJhbW91bnRMYWJlbHMiLCJhbW91bnRWYWx1ZSIsImFtb3VudERlc2NyaXB0aW9uIiwiYW1vdW50RmllbGQiLCJjdXN0b21BbW91bnRGcmVxdWVuY3kiLCJsZXZlbFZpZXdlciIsImxldmVsTmFtZSIsInVzZXJDdXJyZW50TGV2ZWwiLCJkZWNsaW5lQmVuZWZpdHMiLCJnaWZ0U2VsZWN0aW9uR3JvdXAiLCJzd2FnRWxpZ2liaWxpdHlUZXh0Iiwic3dhZ1NlbGVjdG9yIiwic3dhZ0xhYmVscyIsInN1YnNjcmlwdGlvbnNTZWxlY3RvciIsInN1YnNjcmlwdGlvbnNMYWJlbHMiLCJtaW5BbW91bnRzIiwiZGVjbGluZVN1YnNjcmlwdGlvbnMiLCJQbHVnaW4iLCJlbGVtZW50Iiwib3B0aW9ucyIsImV4dGVuZCIsIl9kZWZhdWx0cyIsIl9uYW1lIiwiaW5pdCIsIiRmcmVxdWVuY3kiLCJmaW5kIiwiJHN1Z2dlc3RlZEFtb3VudCIsIiRhbW91bnQiLCIkZGVjbGluZUJlbmVmaXRzIiwiJHN1YnNjcmlwdGlvbnMiLCJsZW5ndGgiLCJnYSIsInNldEFtb3VudExhYmVscyIsImZpbHRlciIsInZhbCIsInNldE1pbkFtb3VudHMiLCJjaGVja0FuZFNldExldmVsIiwib24iLCJvbkZyZXF1ZW5jeUNoYW5nZSIsImJpbmQiLCJvblN1Z2dlc3RlZEFtb3VudENoYW5nZSIsIm9uQW1vdW50Q2hhbmdlIiwibm90IiwiaXMiLCJwcm9wIiwib25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UiLCJvblN1YnNjcmlwdGlvbnNDbGljayIsImFuYWx5dGljc1RyYWNrZXIiLCJmcmVxdWVuY3lfbGFiZWwiLCJ0b0xvd2VyQ2FzZSIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJldmVudCIsInRhcmdldCIsImNsZWFyQW1vdW50U2VsZWN0b3IiLCIkdGFyZ2V0IiwiJGdpZnRTZWxlY3Rpb25Hcm91cCIsImRlY2xpbmUiLCJoaWRlIiwic2hvdyIsIiRkZWNsaW5lIiwiZnJlcXVlbmN5U3RyaW5nIiwiJGdyb3VwcyIsIiRzZWxlY3RlZCIsImluZGV4IiwiJGN1c3RvbUFtb3VudEZyZXF1ZW5jeSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJjdXJyZW50RnJlcXVlbmN5TGFiZWwiLCJmaXJzdCIsInRleHQiLCIkZWxlbWVudHMiLCJmcmVxdWVuY3lfc3RyaW5nIiwic3BsaXQiLCJmcmVxdWVuY3lfbmFtZSIsImZyZXF1ZW5jeV9pZCIsInNob3dOZXdMZXZlbCIsInNldEVuYWJsZWRHaWZ0cyIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbFZpZXdlckNvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJyZXBsYWNlIiwibWF0Y2giLCJkZWMiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJtZW1iZXJfbGV2ZWwiLCJodG1sIiwic2V0RW5hYmxlZCIsInllYXJseUFtb3VudCIsImVhY2giLCJmbiIsImpRdWVyeSIsImJlbmVmaXRGb3JtIiwicGVyZm9ybWFuY2UiLCJuYXZpZ2F0aW9uIiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZW1vdmVBdHRyIiwiY2xpY2siLCJwcmV2ZW50RGVmYXVsdCIsIiRidXR0b24iLCIkc3RhdHVzIiwicGFyZW50IiwiJHNlbGVjdCIsImJlbmVmaXRUeXBlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJidXR0b25fdmFsdWUiLCJidXR0b25fbGFiZWwiLCJidXR0b25fY2xhc3MiLCJidXR0b25fYXR0ciIsIm1lc3NhZ2UiLCJtZXNzYWdlX2NsYXNzIiwiYXR0ciIsInJlbW92ZV9pbnN0YW5jZV92YWx1ZSIsImkiLCJyZW1vdmUiLCJyZWFkeSIsIm1wX21lbWJlcnNoaXBfYW5hbHl0aWNzX3RyYWNraW5nX2V2ZW50IiwiY2F0ZWdvcnkiLCJhY3Rpb24iLCJsYWJlbCIsInZhbHVlIiwicGF0aG5hbWUiLCJ1bmRlZmluZWQiLCJyZXNldCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwiZSIsImhvc3RuYW1lIiwiaGFzaCIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwibGV2ZWxfbnVtYmVyIiwibGV2ZWxzX2NvbnRhaW5lciIsInNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yIiwiZmxpcHBlZF9pdGVtcyIsIndyYXBBbGwiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsImNsb3Nlc3QiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwiY2hhbmdlQW1vdW50UHJldmlldyIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyIsInN1Ym1pdCIsImFuYWx5dGljc0V2ZW50VHJhY2siLCJhbmFseXRpY3NFY29tbWVyY2VUcmFjayIsImhhc0NsYXNzIl0sIm1hcHBpbmdzIjoiOztBQUFBOztBQUFDLENBQUMsVUFBV0EsTUFBWCxFQUFvQjtBQUNyQixXQUFTQyxrQkFBVCxDQUE2QkMsSUFBN0IsRUFBbUNDLFFBQW5DLEVBQThDO0FBQzdDLFNBQUtELElBQUwsR0FBWSxFQUFaOztBQUNBLFFBQUksT0FBT0EsSUFBUCxLQUFnQixXQUFwQixFQUFpQztBQUNoQyxXQUFLQSxJQUFMLEdBQVlBLElBQVo7QUFDQTs7QUFFRCxTQUFLQyxRQUFMLEdBQWdCLEVBQWhCOztBQUNBLFFBQUksT0FBT0EsUUFBUCxLQUFvQixXQUF4QixFQUFxQztBQUNwQyxXQUFLQSxRQUFMLEdBQWdCQSxRQUFoQjtBQUNBOztBQUVELFNBQUtDLGNBQUwsR0FBc0IsRUFBdEI7O0FBQ0EsUUFBSyxPQUFPLEtBQUtGLElBQUwsQ0FBVUcsWUFBakIsS0FBa0MsV0FBbEMsSUFDQSxPQUFPLEtBQUtILElBQUwsQ0FBVUcsWUFBVixDQUF1QkMsZUFBOUIsS0FBa0QsV0FEdkQsRUFDcUU7QUFDcEUsV0FBS0YsY0FBTCxHQUFzQixLQUFLRixJQUFMLENBQVVHLFlBQVYsQ0FBdUJDLGVBQTdDO0FBQ0E7QUFDRDs7QUFFREwsRUFBQUEsa0JBQWtCLENBQUNNLFNBQW5CLEdBQStCO0FBQzlCQyxJQUFBQSxVQUFVLEVBQUUsb0JBQVVDLE1BQVYsRUFBa0JDLFNBQWxCLEVBQTZCQyxJQUE3QixFQUFvQztBQUMvQyxVQUFJQyxRQUFRLEdBQUdDLFFBQVEsQ0FBRUosTUFBRixDQUFSLEdBQXFCSSxRQUFRLENBQUVILFNBQUYsQ0FBNUM7O0FBQ0EsVUFBSyxPQUFPLEtBQUtOLGNBQVosS0FBK0IsV0FBL0IsSUFBOEMsS0FBS0EsY0FBTCxLQUF3QixFQUEzRSxFQUFnRjtBQUMvRSxZQUFJVSxpQkFBaUIsR0FBR0QsUUFBUSxDQUFFLEtBQUtULGNBQUwsQ0FBb0JXLHdCQUF0QixFQUFnRCxFQUFoRCxDQUFoQztBQUNBLFlBQUlDLGtCQUFrQixHQUFHSCxRQUFRLENBQUUsS0FBS1QsY0FBTCxDQUFvQmEseUJBQXRCLEVBQWlELEVBQWpELENBQWpDO0FBQ0EsWUFBSUMsdUJBQXVCLEdBQUdMLFFBQVEsQ0FBRSxLQUFLVCxjQUFMLENBQW9CYyx1QkFBdEIsRUFBK0MsRUFBL0MsQ0FBdEMsQ0FIK0UsQ0FJL0U7O0FBQ0EsWUFBS1AsSUFBSSxLQUFLLFVBQWQsRUFBMkI7QUFDMUJHLFVBQUFBLGlCQUFpQixJQUFJRixRQUFyQjtBQUNBLFNBRkQsTUFFTztBQUNOTSxVQUFBQSx1QkFBdUIsSUFBSU4sUUFBM0I7QUFDQTs7QUFFREEsUUFBQUEsUUFBUSxHQUFHTyxJQUFJLENBQUNDLEdBQUwsQ0FBVU4saUJBQVYsRUFBNkJFLGtCQUE3QixFQUFpREUsdUJBQWpELENBQVg7QUFDQTs7QUFFRCxhQUFPLEtBQUtHLFFBQUwsQ0FBZVQsUUFBZixDQUFQO0FBQ0EsS0FsQjZCO0FBa0IzQjtBQUVIUyxJQUFBQSxRQUFRLEVBQUUsa0JBQVVULFFBQVYsRUFBcUI7QUFDOUIsVUFBSVUsS0FBSyxHQUFHO0FBQ1gsd0JBQWdCVjtBQURMLE9BQVo7O0FBR0EsVUFBS0EsUUFBUSxHQUFHLENBQVgsSUFBZ0JBLFFBQVEsR0FBRyxFQUFoQyxFQUFxQztBQUNwQ1UsUUFBQUEsS0FBSyxDQUFDLE1BQUQsQ0FBTCxHQUFnQixRQUFoQjtBQUNBQSxRQUFBQSxLQUFLLENBQUMsUUFBRCxDQUFMLEdBQWtCLENBQWxCO0FBQ0EsT0FIRCxNQUlLLElBQUlWLFFBQVEsR0FBRyxFQUFYLElBQWlCQSxRQUFRLEdBQUcsR0FBaEMsRUFBcUM7QUFDekNVLFFBQUFBLEtBQUssQ0FBQyxNQUFELENBQUwsR0FBZ0IsUUFBaEI7QUFDQUEsUUFBQUEsS0FBSyxDQUFDLFFBQUQsQ0FBTCxHQUFrQixDQUFsQjtBQUNBLE9BSEksTUFHRSxJQUFJVixRQUFRLEdBQUcsR0FBWCxJQUFrQkEsUUFBUSxHQUFHLEdBQWpDLEVBQXNDO0FBQzVDVSxRQUFBQSxLQUFLLENBQUMsTUFBRCxDQUFMLEdBQWdCLE1BQWhCO0FBQ0FBLFFBQUFBLEtBQUssQ0FBQyxRQUFELENBQUwsR0FBa0IsQ0FBbEI7QUFDQSxPQUhNLE1BR0EsSUFBSVYsUUFBUSxHQUFHLEdBQWYsRUFBb0I7QUFDMUJVLFFBQUFBLEtBQUssQ0FBQyxNQUFELENBQUwsR0FBZ0IsVUFBaEI7QUFDQUEsUUFBQUEsS0FBSyxDQUFDLFFBQUQsQ0FBTCxHQUFrQixDQUFsQjtBQUNBOztBQUNELGFBQU9BLEtBQVA7QUFDQSxLQXZDNkIsQ0F1QzNCOztBQXZDMkIsR0FBL0I7QUEwQ0F0QixFQUFBQSxNQUFNLENBQUNDLGtCQUFQLEdBQTRCLElBQUlBLGtCQUFKLENBQzNCRCxNQUFNLENBQUN1Qix3QkFEb0IsRUFFM0J2QixNQUFNLENBQUN3Qiw0QkFGb0IsQ0FBNUI7QUFJQSxDQWpFQSxFQWlFR3hCLE1BakVIOzs7QUNBRDtBQUNBOztBQUFDLENBQUMsVUFBV3lCLENBQVgsRUFBY3pCLE1BQWQsRUFBc0IwQixRQUF0QixFQUFnQ3pCLGtCQUFoQyxFQUFxRDtBQUN0RDtBQUNBLE1BQUkwQixVQUFVLEdBQUcsc0JBQWpCO0FBQUEsTUFDQUMsUUFBUSxHQUFHO0FBQ1ZDLElBQUFBLGlCQUFpQixFQUFFLHlDQURUO0FBRVZDLElBQUFBLFdBQVcsRUFBRSxvQkFGSDtBQUdWQyxJQUFBQSxjQUFjLEVBQUUsc0NBSE47QUFJVkMsSUFBQUEsWUFBWSxFQUFFLHdCQUpKO0FBS1ZDLElBQUFBLFdBQVcsRUFBRSxRQUxIO0FBTVZDLElBQUFBLGlCQUFpQixFQUFFLHVCQU5UO0FBT1ZDLElBQUFBLFdBQVcsRUFBRSx5QkFQSDtBQVFWQyxJQUFBQSxxQkFBcUIsRUFBRSxzQ0FSYjtBQVNWQyxJQUFBQSxXQUFXLEVBQUUsZUFUSDtBQVVWQyxJQUFBQSxTQUFTLEVBQUUsVUFWRDtBQVdWQyxJQUFBQSxnQkFBZ0IsRUFBRSxrQkFYUjtBQVlWQyxJQUFBQSxlQUFlLEVBQUUsZ0RBWlA7QUFhVkMsSUFBQUEsa0JBQWtCLEVBQUUsNkJBYlY7QUFjVkMsSUFBQUEsbUJBQW1CLEVBQUUsK0NBZFg7QUFlVkMsSUFBQUEsWUFBWSxFQUFFLG9DQWZKO0FBZ0JWQyxJQUFBQSxVQUFVLEVBQUUsNENBaEJGO0FBaUJWQyxJQUFBQSxxQkFBcUIsRUFBRSw0Q0FqQmI7QUFrQlZDLElBQUFBLG1CQUFtQixFQUFFLG9EQWxCWDtBQW1CVkMsSUFBQUEsVUFBVSxFQUFFLHlDQW5CRjtBQW9CVkMsSUFBQUEsb0JBQW9CLEVBQUU7QUFwQlosR0FEWCxDQUZzRCxDQTBCdEQ7O0FBQ0EsV0FBU0MsTUFBVCxDQUFpQkMsT0FBakIsRUFBMEJDLE9BQTFCLEVBQW9DO0FBQ25DLFNBQUtELE9BQUwsR0FBZUEsT0FBZixDQURtQyxDQUduQztBQUNBO0FBQ0E7QUFDQTs7QUFDQSxTQUFLQyxPQUFMLEdBQWUxQixDQUFDLENBQUMyQixNQUFGLENBQVUsRUFBVixFQUFjeEIsUUFBZCxFQUF3QnVCLE9BQXhCLENBQWY7QUFFQSxTQUFLRSxTQUFMLEdBQWlCekIsUUFBakI7QUFDQSxTQUFLMEIsS0FBTCxHQUFhM0IsVUFBYjtBQUVBLFNBQUs0QixJQUFMO0FBQ0EsR0F4Q3FELENBd0NwRDs7O0FBRUZOLEVBQUFBLE1BQU0sQ0FBQzFDLFNBQVAsR0FBbUI7QUFDbEJnRCxJQUFBQSxJQUFJLEVBQUUsZ0JBQVc7QUFDaEIsVUFBSUMsVUFBVSxHQUFHL0IsQ0FBQyxDQUFFLEtBQUt5QixPQUFQLENBQUQsQ0FBa0JPLElBQWxCLENBQXdCLEtBQUtOLE9BQUwsQ0FBYXRCLGlCQUFyQyxDQUFqQjtBQUNBLFVBQUk2QixnQkFBZ0IsR0FBR2pDLENBQUMsQ0FBRSxLQUFLMEIsT0FBTCxDQUFhcEIsY0FBZixDQUF4QjtBQUNBLFVBQUk0QixPQUFPLEdBQUdsQyxDQUFDLENBQUUsS0FBS3lCLE9BQVAsQ0FBRCxDQUFrQk8sSUFBbEIsQ0FBd0IsS0FBS04sT0FBTCxDQUFhaEIsV0FBckMsQ0FBZDtBQUNBLFVBQUl5QixnQkFBZ0IsR0FBR25DLENBQUMsQ0FBRSxLQUFLeUIsT0FBUCxDQUFELENBQWtCTyxJQUFsQixDQUF3QixLQUFLTixPQUFMLENBQWFYLGVBQXJDLENBQXZCO0FBQ0EsVUFBSXFCLGNBQWMsR0FBR3BDLENBQUMsQ0FBRSxLQUFLeUIsT0FBUCxDQUFELENBQWtCTyxJQUFsQixDQUF3QixLQUFLTixPQUFMLENBQWFOLHFCQUFyQyxDQUFyQjs7QUFDQSxVQUFLLEVBQUdjLE9BQU8sQ0FBQ0csTUFBUixHQUFpQixDQUFqQixJQUNBTixVQUFVLENBQUNNLE1BQVgsR0FBb0IsQ0FEcEIsSUFFQUosZ0JBQWdCLENBQUNJLE1BQWpCLEdBQTBCLENBRjdCLENBQUwsRUFFd0M7QUFDdkM7QUFDQSxPQVZlLENBWWhCOzs7QUFDQSxVQUFLLE9BQU9DLEVBQVAsS0FBYyxXQUFuQixFQUFpQztBQUNoQ0EsUUFBQUEsRUFBRSxDQUFFLFNBQUYsRUFBYSxJQUFiLENBQUY7QUFDQSxPQWZlLENBaUJoQjs7O0FBQ0EsV0FBS0MsZUFBTCxDQUFzQlIsVUFBVSxDQUFDUyxNQUFYLENBQWtCLFVBQWxCLEVBQThCQyxHQUE5QixFQUF0QjtBQUNBLFdBQUtDLGFBQUwsQ0FBb0JYLFVBQVUsQ0FBQ1MsTUFBWCxDQUFrQixVQUFsQixFQUE4QkMsR0FBOUIsRUFBcEI7QUFDQSxXQUFLRSxnQkFBTDtBQUVBWixNQUFBQSxVQUFVLENBQUNhLEVBQVgsQ0FBZSxRQUFmLEVBQXlCLEtBQUtDLGlCQUFMLENBQXVCQyxJQUF2QixDQUE0QixJQUE1QixDQUF6QjtBQUNBYixNQUFBQSxnQkFBZ0IsQ0FBQ1csRUFBakIsQ0FBcUIsUUFBckIsRUFBK0IsS0FBS0csdUJBQUwsQ0FBNkJELElBQTdCLENBQWtDLElBQWxDLENBQS9CO0FBQ0FaLE1BQUFBLE9BQU8sQ0FBQ1UsRUFBUixDQUFZLGVBQVosRUFBNkIsS0FBS0ksY0FBTCxDQUFvQkYsSUFBcEIsQ0FBeUIsSUFBekIsQ0FBN0I7O0FBRUEsVUFBSyxFQUFJWCxnQkFBZ0IsQ0FBQ0UsTUFBakIsR0FBMEIsQ0FBMUIsSUFBK0JELGNBQWMsQ0FBQ0MsTUFBZixHQUF3QixDQUEzRCxDQUFMLEVBQXNFO0FBQ3JFO0FBQ0EsT0E1QmUsQ0E4QmhCOzs7QUFDQSxVQUFLRCxjQUFjLENBQUNhLEdBQWYsQ0FBb0IsS0FBS3ZCLE9BQUwsQ0FBYUgsb0JBQWpDLEVBQXdEMkIsRUFBeEQsQ0FBNEQsVUFBNUQsQ0FBTCxFQUFnRjtBQUMvRWxELFFBQUFBLENBQUMsQ0FBRSxLQUFLeUIsT0FBUCxDQUFELENBQWtCTyxJQUFsQixDQUF3QixLQUFLTixPQUFMLENBQWFILG9CQUFyQyxFQUE0RDRCLElBQTVELENBQWtFLFNBQWxFLEVBQTZFLEtBQTdFO0FBQ0E7O0FBQ0QsV0FBS0MsdUJBQUw7QUFFQWpCLE1BQUFBLGdCQUFnQixDQUFDUyxFQUFqQixDQUFxQixRQUFyQixFQUErQixLQUFLUSx1QkFBTCxDQUE2Qk4sSUFBN0IsQ0FBbUMsSUFBbkMsQ0FBL0I7QUFDQVYsTUFBQUEsY0FBYyxDQUFDUSxFQUFmLENBQW1CLE9BQW5CLEVBQTRCLEtBQUtTLG9CQUFMLENBQTBCUCxJQUExQixDQUFnQyxJQUFoQyxDQUE1QjtBQUNBLEtBdkNpQjtBQXVDZjtBQUVGO0FBQ0E7QUFDQTtBQUNBOztBQUNBOzs7QUFHRFEsSUFBQUEsZ0JBQWdCLEVBQUUsMEJBQVV6RCxLQUFWLEVBQWlCYixNQUFqQixFQUF5QnVFLGVBQXpCLEVBQTJDO0FBQzVELFVBQUssT0FBT2pCLEVBQVAsS0FBYyxXQUFuQixFQUFpQztBQUNoQ0EsUUFBQUEsRUFBRSxDQUFFLGVBQUYsRUFBbUI7QUFDcEIsZ0JBQU0sY0FBY3pDLEtBQUssQ0FBQzJELFdBQU4sRUFBZCxHQUFvQyxhQUR0QjtBQUVwQixrQkFBUSxjQUFjM0QsS0FBSyxDQUFDNEQsTUFBTixDQUFhLENBQWIsRUFBZ0JDLFdBQWhCLEVBQWQsR0FBOEM3RCxLQUFLLENBQUM4RCxLQUFOLENBQVksQ0FBWixDQUE5QyxHQUErRCxhQUZuRDtBQUdwQixzQkFBWSxVQUhRO0FBSXBCLG1CQUFTLFVBSlc7QUFLcEIscUJBQVlKLGVBTFE7QUFNcEIsbUJBQVN2RSxNQU5XO0FBT3BCLHNCQUFZO0FBUFEsU0FBbkIsQ0FBRjtBQVNBLE9BVkQsTUFVTztBQUNOO0FBQ0E7QUFDRCxLQTlEaUI7QUE4RGY7QUFFSDZELElBQUFBLGlCQUFpQixFQUFFLDJCQUFVZSxLQUFWLEVBQWtCO0FBQ3BDLFdBQUtyQixlQUFMLENBQXNCdkMsQ0FBQyxDQUFFNEQsS0FBSyxDQUFDQyxNQUFSLENBQUQsQ0FBa0JwQixHQUFsQixFQUF0QjtBQUNBLFdBQUtDLGFBQUwsQ0FBb0IxQyxDQUFDLENBQUU0RCxLQUFLLENBQUNDLE1BQVIsQ0FBRCxDQUFrQnBCLEdBQWxCLEVBQXBCO0FBQ0EsV0FBS0UsZ0JBQUw7QUFDQSxLQXBFaUI7QUFvRWY7QUFFSEksSUFBQUEsdUJBQXVCLEVBQUUsaUNBQVVhLEtBQVYsRUFBa0I7QUFDMUM1RCxNQUFBQSxDQUFDLENBQUUsS0FBS3lCLE9BQVAsQ0FBRCxDQUFrQk8sSUFBbEIsQ0FBd0IsS0FBS04sT0FBTCxDQUFhaEIsV0FBckMsRUFBbUQrQixHQUFuRCxDQUF3RCxJQUF4RDtBQUNBLFdBQUtFLGdCQUFMO0FBQ0EsS0F6RWlCO0FBeUVmO0FBRUhLLElBQUFBLGNBQWMsRUFBRSx3QkFBVVksS0FBVixFQUFrQjtBQUNqQyxXQUFLRSxtQkFBTCxDQUEwQkYsS0FBMUI7QUFFQSxVQUFJRyxPQUFPLEdBQUcvRCxDQUFDLENBQUU0RCxLQUFLLENBQUNDLE1BQVIsQ0FBZjs7QUFDQSxVQUFLRSxPQUFPLENBQUN0RixJQUFSLENBQWMsWUFBZCxLQUFnQ3NGLE9BQU8sQ0FBQ3RCLEdBQVIsRUFBckMsRUFBcUQ7QUFDcERzQixRQUFBQSxPQUFPLENBQUN0RixJQUFSLENBQWMsWUFBZCxFQUE0QnNGLE9BQU8sQ0FBQ3RCLEdBQVIsRUFBNUI7QUFDQSxhQUFLRSxnQkFBTDtBQUNBO0FBQ0QsS0FuRmlCO0FBbUZmO0FBRUhTLElBQUFBLHVCQUF1QixFQUFFLGlDQUFVUSxLQUFWLEVBQWtCO0FBQzFDLFVBQUlJLG1CQUFtQixHQUFHaEUsQ0FBQyxDQUFFLEtBQUt5QixPQUFQLENBQUQsQ0FBa0JPLElBQWxCLENBQXdCLEtBQUtOLE9BQUwsQ0FBYVYsa0JBQXJDLENBQTFCO0FBQ0EsVUFBSWlELE9BQU8sR0FBR2pFLENBQUMsQ0FBRSxLQUFLeUIsT0FBUCxDQUFELENBQWtCTyxJQUFsQixDQUF3QixLQUFLTixPQUFMLENBQWFYLGVBQXJDLEVBQXVEeUIsTUFBdkQsQ0FBK0QsVUFBL0QsRUFBNEVDLEdBQTVFLEVBQWQ7O0FBRUEsVUFBS3dCLE9BQU8sS0FBSyxNQUFqQixFQUEwQjtBQUN6QkQsUUFBQUEsbUJBQW1CLENBQUNFLElBQXBCO0FBQ0E7QUFDQTs7QUFFREYsTUFBQUEsbUJBQW1CLENBQUNHLElBQXBCO0FBQ0EsS0EvRmlCO0FBK0ZmO0FBRUhkLElBQUFBLG9CQUFvQixFQUFFLDhCQUFVTyxLQUFWLEVBQWtCO0FBQ3ZDLFVBQUl4QixjQUFjLEdBQUdwQyxDQUFDLENBQUUsS0FBS3lCLE9BQVAsQ0FBRCxDQUFrQk8sSUFBbEIsQ0FBd0IsS0FBS04sT0FBTCxDQUFhTixxQkFBckMsRUFBNkQ2QixHQUE3RCxDQUFrRSxLQUFLdkIsT0FBTCxDQUFhSCxvQkFBL0UsQ0FBckI7QUFDQSxVQUFJNkMsUUFBUSxHQUFHcEUsQ0FBQyxDQUFFLEtBQUt5QixPQUFQLENBQUQsQ0FBa0JPLElBQWxCLENBQXdCLEtBQUtOLE9BQUwsQ0FBYUgsb0JBQXJDLENBQWY7O0FBRUEsVUFBS3ZCLENBQUMsQ0FBRTRELEtBQUssQ0FBQ0MsTUFBUixDQUFELENBQWtCWCxFQUFsQixDQUFzQixLQUFLeEIsT0FBTCxDQUFhSCxvQkFBbkMsQ0FBTCxFQUFpRTtBQUNoRWEsUUFBQUEsY0FBYyxDQUFDZSxJQUFmLENBQXFCLFNBQXJCLEVBQWdDLEtBQWhDO0FBQ0E7QUFDQTs7QUFFRGlCLE1BQUFBLFFBQVEsQ0FBQ2pCLElBQVQsQ0FBZSxTQUFmLEVBQTBCLEtBQTFCO0FBQ0EsS0EzR2lCO0FBMkdmO0FBRUhXLElBQUFBLG1CQUFtQixFQUFFLDZCQUFVRixLQUFWLEVBQWtCO0FBQ3RDLFVBQUkzQixnQkFBZ0IsR0FBR2pDLENBQUMsQ0FBRSxLQUFLMEIsT0FBTCxDQUFhcEIsY0FBZixDQUF4Qjs7QUFFQSxVQUFLTixDQUFDLENBQUU0RCxLQUFLLENBQUNDLE1BQVIsQ0FBRCxDQUFrQnBCLEdBQWxCLE9BQTRCLEVBQWpDLEVBQXNDO0FBQ3JDO0FBQ0E7O0FBRURSLE1BQUFBLGdCQUFnQixDQUFDa0IsSUFBakIsQ0FBdUIsU0FBdkIsRUFBa0MsS0FBbEM7QUFDQSxLQXJIaUI7QUFxSGY7QUFFSFosSUFBQUEsZUFBZSxFQUFFLHlCQUFVOEIsZUFBVixFQUE0QjtBQUM1QyxVQUFJQyxPQUFPLEdBQUd0RSxDQUFDLENBQUUsS0FBSzBCLE9BQUwsQ0FBYXJCLFdBQWYsQ0FBZjtBQUNBLFVBQUlrRSxTQUFTLEdBQUd2RSxDQUFDLENBQUUsS0FBSzBCLE9BQUwsQ0FBYXBCLGNBQWYsQ0FBRCxDQUNYa0MsTUFEVyxDQUNILFVBREcsQ0FBaEI7QUFFQSxVQUFJZ0MsS0FBSyxHQUFHRCxTQUFTLENBQUM5RixJQUFWLENBQWdCLE9BQWhCLENBQVo7QUFDQSxVQUFJZ0csc0JBQXNCLEdBQUd6RSxDQUFDLENBQUUsS0FBSzBCLE9BQUwsQ0FBYWYscUJBQWYsQ0FBOUI7QUFFQTJELE1BQUFBLE9BQU8sQ0FBQ0ksV0FBUixDQUFxQixRQUFyQjtBQUNBSixNQUFBQSxPQUFPLENBQUM5QixNQUFSLENBQWdCLHNCQUFzQjZCLGVBQXRCLEdBQXdDLElBQXhELEVBQ0VNLFFBREYsQ0FDWSxRQURaO0FBRUFKLE1BQUFBLFNBQVMsQ0FBQ3BCLElBQVYsQ0FBZ0IsU0FBaEIsRUFBMkIsS0FBM0I7QUFDQW1CLE1BQUFBLE9BQU8sQ0FBQzlCLE1BQVIsQ0FBZ0IsU0FBaEIsRUFDRVIsSUFERixDQUNRLHFDQUFxQ3dDLEtBQXJDLEdBQTZDLElBRHJELEVBRUVyQixJQUZGLENBRVEsU0FGUixFQUVtQixJQUZuQjtBQUlBLFVBQUl5QixxQkFBcUIsR0FBR04sT0FBTyxDQUFDOUIsTUFBUixDQUFnQixTQUFoQixFQUE0QlIsSUFBNUIsQ0FBaUMseUJBQWpDLEVBQTRENkMsS0FBNUQsR0FBb0VDLElBQXBFLEVBQTVCO0FBQ0FMLE1BQUFBLHNCQUFzQixDQUFDSyxJQUF2QixDQUE2QkYscUJBQTdCO0FBQ0EsS0F4SWlCO0FBd0lmO0FBRUhsQyxJQUFBQSxhQUFhLEVBQUUsdUJBQVUyQixlQUFWLEVBQTRCO0FBQzFDLFVBQUlVLFNBQVMsR0FBRy9FLENBQUMsQ0FBRSxLQUFLMEIsT0FBTCxDQUFhSixVQUFmLENBQWpCO0FBQ0F5RCxNQUFBQSxTQUFTLENBQUNMLFdBQVYsQ0FBdUIsUUFBdkI7QUFDQUssTUFBQUEsU0FBUyxDQUFDdkMsTUFBVixDQUFrQixzQkFBc0I2QixlQUF0QixHQUF3QyxJQUExRCxFQUNFTSxRQURGLENBQ1ksUUFEWjtBQUVBLEtBL0lpQjtBQStJZjtBQUVIaEMsSUFBQUEsZ0JBQWdCLEVBQUUsNEJBQVc7QUFDNUIsVUFBSTNELE1BQU0sR0FBR2dCLENBQUMsQ0FBRSxLQUFLMEIsT0FBTCxDQUFhcEIsY0FBZixDQUFELENBQWlDa0MsTUFBakMsQ0FBeUMsVUFBekMsRUFBc0RDLEdBQXRELEVBQWI7O0FBQ0EsVUFBSyxPQUFPekQsTUFBUCxLQUFrQixXQUF2QixFQUFxQztBQUNwQ0EsUUFBQUEsTUFBTSxHQUFHZ0IsQ0FBQyxDQUFFLEtBQUswQixPQUFMLENBQWFoQixXQUFmLENBQUQsQ0FBOEIrQixHQUE5QixFQUFUO0FBQ0E7O0FBRUQsVUFBSXVDLGdCQUFnQixHQUFHaEYsQ0FBQyxDQUFFLEtBQUswQixPQUFMLENBQWF0QixpQkFBYixHQUFpQyxVQUFuQyxDQUFELENBQWlEcUMsR0FBakQsRUFBdkI7QUFDQSxVQUFJeEQsU0FBUyxHQUFHK0YsZ0JBQWdCLENBQUNDLEtBQWpCLENBQXVCLEtBQXZCLEVBQThCLENBQTlCLENBQWhCO0FBQ0EsVUFBSUMsY0FBYyxHQUFHRixnQkFBZ0IsQ0FBQ0MsS0FBakIsQ0FBdUIsS0FBdkIsRUFBOEIsQ0FBOUIsQ0FBckI7QUFDQSxVQUFJRSxZQUFZLEdBQUduRixDQUFDLENBQUUsS0FBSzBCLE9BQUwsQ0FBYXRCLGlCQUFiLEdBQWlDLFVBQW5DLENBQUQsQ0FBaUQrQyxJQUFqRCxDQUF1RCxJQUF2RCxDQUFuQjtBQUNBLFVBQUlJLGVBQWUsR0FBR3ZELENBQUMsQ0FBRSxnQkFBZ0JtRixZQUFoQixHQUErQixJQUFqQyxDQUFELENBQXlDTCxJQUF6QyxFQUF0QjtBQUVBLFVBQUlqRixLQUFLLEdBQUdyQixrQkFBa0IsQ0FBQ08sVUFBbkIsQ0FBK0JDLE1BQS9CLEVBQXVDQyxTQUF2QyxFQUFrRGlHLGNBQWxELENBQVo7QUFDQSxXQUFLRSxZQUFMLENBQW1CLEtBQUszRCxPQUF4QixFQUFpQyxLQUFLQyxPQUF0QyxFQUErQzdCLEtBQS9DO0FBQ0EsV0FBS3dGLGVBQUwsQ0FBc0J4RixLQUF0QjtBQUNBLFdBQUt5RCxnQkFBTCxDQUF1QnpELEtBQUssQ0FBQyxNQUFELENBQTVCLEVBQXNDYixNQUF0QyxFQUE4Q3VFLGVBQTlDO0FBQ0EsS0FqS2lCO0FBaUtmO0FBRUg2QixJQUFBQSxZQUFZLEVBQUUsc0JBQVUzRCxPQUFWLEVBQW1CQyxPQUFuQixFQUE0QjdCLEtBQTVCLEVBQW9DO0FBQ2pELFVBQUl5RixtQkFBbUIsR0FBRyxFQUExQjtBQUNBLFVBQUlDLFNBQVMsR0FBRyxFQUFoQjtBQUNBLFVBQUlDLG9CQUFvQixHQUFHOUQsT0FBTyxDQUFDZCxXQUFuQyxDQUhpRCxDQUdEOztBQUNoRCxVQUFJNkUsZ0JBQWdCLEdBQUcsU0FBbkJBLGdCQUFtQixDQUFVQyxHQUFWLEVBQWdCO0FBQ3RDLGVBQU9BLEdBQUcsQ0FBQ0MsT0FBSixDQUFhLFdBQWIsRUFBMEIsVUFBVUMsS0FBVixFQUFpQkMsR0FBakIsRUFBdUI7QUFDdkQsaUJBQU9DLE1BQU0sQ0FBQ0MsWUFBUCxDQUFxQkYsR0FBckIsQ0FBUDtBQUNBLFNBRk0sQ0FBUDtBQUdBLE9BSkQ7O0FBS0EsVUFBSyxPQUFPL0Ysd0JBQVAsS0FBb0MsV0FBekMsRUFBdUQ7QUFDdER3RixRQUFBQSxtQkFBbUIsR0FBR3hGLHdCQUF3QixDQUFDd0YsbUJBQS9DO0FBQ0E7O0FBRUQsVUFBS3RGLENBQUMsQ0FBRTBCLE9BQU8sQ0FBQ2QsV0FBVixDQUFELENBQXlCeUIsTUFBekIsR0FBa0MsQ0FBdkMsRUFBMkM7QUFFMUNyQyxRQUFBQSxDQUFDLENBQUMwQixPQUFPLENBQUNkLFdBQVQsQ0FBRCxDQUF1QnVDLElBQXZCLENBQTZCLE9BQTdCLEVBQXNDLCtCQUErQnRELEtBQUssQ0FBQyxNQUFELENBQUwsQ0FBYzJELFdBQWQsRUFBckU7O0FBRUEsWUFBS3hELENBQUMsQ0FBRTBCLE9BQU8sQ0FBQ1osZ0JBQVYsQ0FBRCxDQUE4QnVCLE1BQTlCLEdBQXVDLENBQXZDLElBQTRDdkMsd0JBQXdCLENBQUNsQixZQUF6QixDQUFzQ29ILFlBQXRDLENBQW1EM0QsTUFBbkQsR0FBNEQsQ0FBN0csRUFBaUg7QUFFaEgsY0FBSyxLQUFLckMsQ0FBQyxDQUFFMEIsT0FBTyxDQUFDZCxXQUFWLENBQUQsQ0FBeUJ5QixNQUF6QixHQUFrQyxDQUE1QyxFQUFnRDtBQUMvQ21ELFlBQUFBLG9CQUFvQixHQUFHOUQsT0FBTyxDQUFDZCxXQUFSLEdBQXNCLElBQTdDO0FBQ0E7O0FBRUQyRSxVQUFBQSxTQUFTLEdBQUd6Rix3QkFBd0IsQ0FBQ2xCLFlBQXpCLENBQXNDb0gsWUFBdEMsQ0FBbURMLE9BQW5ELENBQTRETCxtQkFBNUQsRUFBaUYsRUFBakYsQ0FBWjs7QUFFQSxjQUFLQyxTQUFTLEtBQUsxRixLQUFLLENBQUMsTUFBRCxDQUFMLENBQWMyRCxXQUFkLEVBQW5CLEVBQWlEO0FBQ2hEeEQsWUFBQUEsQ0FBQyxDQUFFd0Ysb0JBQUYsQ0FBRCxDQUEwQlMsSUFBMUIsQ0FBZ0NSLGdCQUFnQixDQUFFekYsQ0FBQyxDQUFFMEIsT0FBTyxDQUFDZCxXQUFWLENBQUQsQ0FBeUJuQyxJQUF6QixDQUErQixTQUEvQixDQUFGLENBQWhEO0FBQ0EsV0FGRCxNQUVPO0FBQ051QixZQUFBQSxDQUFDLENBQUV3RixvQkFBRixDQUFELENBQTBCUyxJQUExQixDQUFnQ1IsZ0JBQWdCLENBQUV6RixDQUFDLENBQUUwQixPQUFPLENBQUNkLFdBQVYsQ0FBRCxDQUF5Qm5DLElBQXpCLENBQStCLGFBQS9CLENBQUYsQ0FBaEQ7QUFDQTtBQUNEOztBQUVEdUIsUUFBQUEsQ0FBQyxDQUFDMEIsT0FBTyxDQUFDYixTQUFULEVBQW9CYSxPQUFPLENBQUNkLFdBQTVCLENBQUQsQ0FBMENrRSxJQUExQyxDQUFnRGpGLEtBQUssQ0FBQyxNQUFELENBQXJEO0FBQ0E7QUFDRCxLQXJNaUI7QUFxTWY7QUFFSHdGLElBQUFBLGVBQWUsRUFBRSx5QkFBVXhGLEtBQVYsRUFBa0I7QUFDbEMsVUFBSXFHLFVBQVUsR0FBRyxTQUFiQSxVQUFhLEdBQVc7QUFDM0JsRyxRQUFBQSxDQUFDLENBQUUsSUFBRixDQUFELENBQVVtRCxJQUFWLENBQWdCLFVBQWhCLEVBQTRCdEQsS0FBSyxDQUFDc0csWUFBTixHQUFxQm5HLENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVXZCLElBQVYsQ0FBZ0IsaUJBQWhCLENBQWpEO0FBQ0EsT0FGRDs7QUFJQXVCLE1BQUFBLENBQUMsQ0FBRSxLQUFLMEIsT0FBTCxDQUFhUixZQUFmLENBQUQsQ0FBK0JrRixJQUEvQixDQUFxQ0YsVUFBckM7QUFDQWxHLE1BQUFBLENBQUMsQ0FBRSxLQUFLMEIsT0FBTCxDQUFhTixxQkFBZixDQUFELENBQXdDZ0YsSUFBeEMsQ0FBOENGLFVBQTlDOztBQUVBLFVBQUtsRyxDQUFDLENBQUUsS0FBSzBCLE9BQUwsQ0FBYVIsWUFBZixDQUFELENBQStCK0IsR0FBL0IsQ0FBb0MsZUFBcEMsRUFBc0RDLEVBQXRELENBQTBELFVBQTFELENBQUwsRUFBOEU7QUFDN0VsRCxRQUFBQSxDQUFDLENBQUUsZ0JBQUYsQ0FBRCxDQUFzQjBFLFdBQXRCLENBQW1DLFFBQW5DO0FBQ0ExRSxRQUFBQSxDQUFDLENBQUUsZUFBRixDQUFELENBQXFCMkUsUUFBckIsQ0FBK0IsUUFBL0I7QUFDQSxPQUhELE1BR087QUFDTjNFLFFBQUFBLENBQUMsQ0FBRSxnQkFBRixDQUFELENBQXNCMkUsUUFBdEIsQ0FBZ0MsUUFBaEM7QUFDQTNFLFFBQUFBLENBQUMsQ0FBRSxlQUFGLENBQUQsQ0FBcUIwRSxXQUFyQixDQUFrQyxRQUFsQztBQUNBO0FBQ0QsS0F0TmlCLENBc05mOztBQXROZSxHQUFuQixDQTFDc0QsQ0FpUW5EO0FBR0g7QUFDQTs7QUFDQTFFLEVBQUFBLENBQUMsQ0FBQ3FHLEVBQUYsQ0FBS25HLFVBQUwsSUFBbUIsVUFBV3dCLE9BQVgsRUFBcUI7QUFDdkMsV0FBTyxLQUFLMEUsSUFBTCxDQUFVLFlBQVk7QUFDNUIsVUFBSyxDQUFFcEcsQ0FBQyxDQUFDdkIsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZeUIsVUFBMUIsQ0FBUCxFQUFnRDtBQUMvQ0YsUUFBQUEsQ0FBQyxDQUFDdkIsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZeUIsVUFBMUIsRUFBc0MsSUFBSXNCLE1BQUosQ0FBWSxJQUFaLEVBQWtCRSxPQUFsQixDQUF0QztBQUNBO0FBQ0QsS0FKTSxDQUFQO0FBS0EsR0FORDtBQU9BLENBN1FBLEVBNlFHNEUsTUE3UUgsRUE2UVcvSCxNQTdRWCxFQTZRbUIwQixRQTdRbkIsRUE2UTZCekIsa0JBN1E3Qjs7O0FDREQsQ0FBRSxVQUFVd0IsQ0FBVixFQUFjO0FBRWYsV0FBU3VHLFdBQVQsR0FBdUI7QUFDdEIsUUFBSyxNQUFNQyxXQUFXLENBQUNDLFVBQVosQ0FBdUJ2SCxJQUFsQyxFQUF5QztBQUN4Q3dILE1BQUFBLFFBQVEsQ0FBQ0MsTUFBVCxDQUFpQixJQUFqQjtBQUNBOztBQUNEM0csSUFBQUEsQ0FBQyxDQUFFLHFDQUFGLENBQUQsQ0FBMkM0RyxVQUEzQyxDQUF1RCxVQUF2RDtBQUNBNUcsSUFBQUEsQ0FBQyxDQUFFLG1CQUFGLENBQUQsQ0FBeUI2RyxLQUF6QixDQUFnQyxVQUFVakQsS0FBVixFQUFrQjtBQUNqREEsTUFBQUEsS0FBSyxDQUFDa0QsY0FBTjtBQUNBLFVBQUlDLE9BQU8sR0FBSS9HLENBQUMsQ0FBRSxJQUFGLENBQWhCO0FBQ0EsVUFBSWdILE9BQU8sR0FBSWhILENBQUMsQ0FBRSxvQkFBRixFQUF3QkEsQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVaUgsTUFBVixFQUF4QixDQUFoQjtBQUNBLFVBQUlDLE9BQU8sR0FBSWxILENBQUMsQ0FBRSxRQUFGLEVBQVlBLENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVWlILE1BQVYsRUFBWixDQUFoQjtBQUNBLFVBQUl2SSxRQUFRLEdBQUdxQiw0QkFBZixDQUxpRCxDQU1qRDs7QUFDQSxVQUFLLENBQUUsNEJBQVAsRUFBc0M7QUFDckNDLFFBQUFBLENBQUMsQ0FBRSxvQkFBRixDQUFELENBQTBCMEUsV0FBMUIsQ0FBdUMsMEVBQXZDO0FBQ0EsT0FUZ0QsQ0FVakQ7OztBQUNBcUMsTUFBQUEsT0FBTyxDQUFDakMsSUFBUixDQUFjLFlBQWQsRUFBNkJILFFBQTdCLENBQXVDLG1CQUF2QyxFQVhpRCxDQWFqRDs7QUFDQTNFLE1BQUFBLENBQUMsQ0FBRSxtQkFBRixDQUFELENBQXlCMkUsUUFBekIsQ0FBbUMsbUJBQW5DLEVBZGlELENBZ0JqRDs7QUFDQSxVQUFJbEcsSUFBSSxHQUFHLEVBQVg7QUFDQSxVQUFJMEksV0FBVyxHQUFHbkgsQ0FBQyxDQUFFLDRCQUFGLENBQUQsQ0FBa0N5QyxHQUFsQyxFQUFsQjs7QUFDQSxVQUFLLHFCQUFxQjBFLFdBQTFCLEVBQXdDO0FBQ3ZDMUksUUFBQUEsSUFBSSxHQUFHO0FBQ04sb0JBQVcscUJBREw7QUFFTixvREFBMkNzSSxPQUFPLENBQUN0SSxJQUFSLENBQWMsZUFBZCxDQUZyQztBQUdOLHlCQUFnQnVCLENBQUMsQ0FBRSwyQkFBRixDQUFELENBQWdDeUMsR0FBaEMsRUFIVjtBQUlOLDBCQUFnQnpDLENBQUMsQ0FBRSw0QkFBRixDQUFELENBQWlDeUMsR0FBakMsRUFKVjtBQUtOLHlCQUFnQnpDLENBQUMsQ0FBRSx3QkFBd0IrRyxPQUFPLENBQUN0RSxHQUFSLEVBQXhCLEdBQXdDLElBQTFDLENBQUQsQ0FBa0RBLEdBQWxELEVBTFY7QUFNTixxQkFBWXNFLE9BQU8sQ0FBQ3RFLEdBQVIsRUFOTjtBQU9OLHFCQUFZO0FBUE4sU0FBUDtBQVVBekMsUUFBQUEsQ0FBQyxDQUFDb0gsSUFBRixDQUFRMUksUUFBUSxDQUFDMkksT0FBakIsRUFBMEI1SSxJQUExQixFQUFnQyxVQUFVNkksUUFBVixFQUFxQjtBQUNwRDtBQUNBLGNBQUssU0FBU0EsUUFBUSxDQUFDQyxPQUF2QixFQUFpQztBQUNoQztBQUNBUixZQUFBQSxPQUFPLENBQUN0RSxHQUFSLENBQWE2RSxRQUFRLENBQUM3SSxJQUFULENBQWMrSSxZQUEzQixFQUEwQzFDLElBQTFDLENBQWdEd0MsUUFBUSxDQUFDN0ksSUFBVCxDQUFjZ0osWUFBOUQsRUFBNkUvQyxXQUE3RSxDQUEwRixtQkFBMUYsRUFBZ0hDLFFBQWhILENBQTBIMkMsUUFBUSxDQUFDN0ksSUFBVCxDQUFjaUosWUFBeEksRUFBdUp2RSxJQUF2SixDQUE2Sm1FLFFBQVEsQ0FBQzdJLElBQVQsQ0FBY2tKLFdBQTNLLEVBQXdMLElBQXhMO0FBQ0FYLFlBQUFBLE9BQU8sQ0FBQ2YsSUFBUixDQUFjcUIsUUFBUSxDQUFDN0ksSUFBVCxDQUFjbUosT0FBNUIsRUFBc0NqRCxRQUF0QyxDQUFnRCwrQkFBK0IyQyxRQUFRLENBQUM3SSxJQUFULENBQWNvSixhQUE3Rjs7QUFDQSxnQkFBSyxJQUFJWCxPQUFPLENBQUM3RSxNQUFqQixFQUEwQjtBQUN6QjZFLGNBQUFBLE9BQU8sQ0FBQy9ELElBQVIsQ0FBYyxVQUFkLEVBQTBCLElBQTFCO0FBQ0E7O0FBQ0RuRCxZQUFBQSxDQUFDLENBQUUsbUJBQUYsQ0FBRCxDQUF5QmlELEdBQXpCLENBQThCOEQsT0FBOUIsRUFBd0N0RSxHQUF4QyxDQUE2QzZFLFFBQVEsQ0FBQzdJLElBQVQsQ0FBYytJLFlBQTNELEVBQTBFTSxJQUExRSxDQUFnRixVQUFoRixFQUE0RixJQUE1RjtBQUNBLFdBUkQsTUFRTztBQUNOO0FBQ0E7QUFDQSxnQkFBSyxnQkFBZ0IsT0FBT1IsUUFBUSxDQUFDN0ksSUFBVCxDQUFjc0oscUJBQTFDLEVBQWtFO0FBQ2pFLGtCQUFLLE9BQU9ULFFBQVEsQ0FBQzdJLElBQVQsQ0FBY2dKLFlBQTFCLEVBQXlDO0FBQ3hDVixnQkFBQUEsT0FBTyxDQUFDNUMsSUFBUjtBQUNBNEMsZ0JBQUFBLE9BQU8sQ0FBQ3RFLEdBQVIsQ0FBYTZFLFFBQVEsQ0FBQzdJLElBQVQsQ0FBYytJLFlBQTNCLEVBQTBDMUMsSUFBMUMsQ0FBZ0R3QyxRQUFRLENBQUM3SSxJQUFULENBQWNnSixZQUE5RCxFQUE2RS9DLFdBQTdFLENBQTBGLG1CQUExRixFQUFnSEMsUUFBaEgsQ0FBMEgyQyxRQUFRLENBQUM3SSxJQUFULENBQWNpSixZQUF4SSxFQUF1SnZFLElBQXZKLENBQTZKbUUsUUFBUSxDQUFDN0ksSUFBVCxDQUFja0osV0FBM0ssRUFBd0wsSUFBeEw7QUFDQSxlQUhELE1BR087QUFDTlosZ0JBQUFBLE9BQU8sQ0FBQzdDLElBQVI7QUFDQTtBQUNELGFBUEQsTUFPTztBQUNObEUsY0FBQUEsQ0FBQyxDQUFFLFFBQUYsRUFBWWtILE9BQVosQ0FBRCxDQUF1QmQsSUFBdkIsQ0FBNkIsVUFBVTRCLENBQVYsRUFBYztBQUMxQyxvQkFBS2hJLENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVXlDLEdBQVYsT0FBb0I2RSxRQUFRLENBQUM3SSxJQUFULENBQWNzSixxQkFBdkMsRUFBK0Q7QUFDOUQvSCxrQkFBQUEsQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVaUksTUFBVjtBQUNBO0FBQ0QsZUFKRDs7QUFLQSxrQkFBSyxPQUFPWCxRQUFRLENBQUM3SSxJQUFULENBQWNnSixZQUExQixFQUF5QztBQUN4Q1YsZ0JBQUFBLE9BQU8sQ0FBQzVDLElBQVI7QUFDQTRDLGdCQUFBQSxPQUFPLENBQUN0RSxHQUFSLENBQWE2RSxRQUFRLENBQUM3SSxJQUFULENBQWMrSSxZQUEzQixFQUEwQzFDLElBQTFDLENBQWdEd0MsUUFBUSxDQUFDN0ksSUFBVCxDQUFjZ0osWUFBOUQsRUFBNkUvQyxXQUE3RSxDQUEwRixtQkFBMUYsRUFBZ0hDLFFBQWhILENBQTBIMkMsUUFBUSxDQUFDN0ksSUFBVCxDQUFjaUosWUFBeEksRUFBdUp2RSxJQUF2SixDQUE2Sm1FLFFBQVEsQ0FBQzdJLElBQVQsQ0FBY2tKLFdBQTNLLEVBQXdMLElBQXhMO0FBQ0EsZUFIRCxNQUdPO0FBQ05aLGdCQUFBQSxPQUFPLENBQUM3QyxJQUFSO0FBQ0E7QUFDRCxhQXRCSyxDQXVCTjs7O0FBQ0FsRSxZQUFBQSxDQUFDLENBQUUsbUJBQUYsQ0FBRCxDQUF5QmlELEdBQXpCLENBQThCOEQsT0FBOUIsRUFBd0NyQyxXQUF4QyxDQUFxRCxtQkFBckQ7QUFDQXNDLFlBQUFBLE9BQU8sQ0FBQ2YsSUFBUixDQUFjcUIsUUFBUSxDQUFDN0ksSUFBVCxDQUFjbUosT0FBNUIsRUFBc0NqRCxRQUF0QyxDQUFnRCwrQkFBK0IyQyxRQUFRLENBQUM3SSxJQUFULENBQWNvSixhQUE3RjtBQUNBO0FBRUQsU0F0Q0Q7QUF1Q0E7QUFDRCxLQXRFRDtBQXVFQTs7QUFFRDdILEVBQUFBLENBQUMsQ0FBRUMsUUFBRixDQUFELENBQWNpSSxLQUFkLENBQXFCLFlBQVc7QUFDL0IsUUFBSyxJQUFJbEksQ0FBQyxDQUFFLDRCQUFGLENBQUQsQ0FBa0NxQyxNQUEzQyxFQUFvRDtBQUNuRGtFLE1BQUFBLFdBQVc7QUFDWDtBQUNELEdBSkQ7QUFNQXZHLEVBQUFBLENBQUMsQ0FBRSxpQkFBRixDQUFELENBQXVCNkcsS0FBdkIsQ0FBOEIsVUFBVWpELEtBQVYsRUFBa0I7QUFDL0NBLElBQUFBLEtBQUssQ0FBQ2tELGNBQU47QUFDQUosSUFBQUEsUUFBUSxDQUFDQyxNQUFUO0FBQ0EsR0FIRDtBQUtBLENBM0ZELEVBMkZLTCxNQTNGTDs7O0FDQUEsQ0FBRSxVQUFVdEcsQ0FBVixFQUFjO0FBQ2YsV0FBU21JLHNDQUFULENBQWlEakosSUFBakQsRUFBdURrSixRQUF2RCxFQUFpRUMsTUFBakUsRUFBeUVDLEtBQXpFLEVBQWdGQyxLQUFoRixFQUF3RjtBQUN2RixRQUFLLE9BQU9qRyxFQUFQLEtBQWMsV0FBbkIsRUFBaUM7QUFDaEMsVUFBSyxPQUFPaUcsS0FBUCxLQUFpQixXQUF0QixFQUFvQztBQUNuQ2pHLFFBQUFBLEVBQUUsQ0FBRSxNQUFGLEVBQVVwRCxJQUFWLEVBQWdCa0osUUFBaEIsRUFBMEJDLE1BQTFCLEVBQWtDQyxLQUFsQyxDQUFGO0FBQ0EsT0FGRCxNQUVPO0FBQ05oRyxRQUFBQSxFQUFFLENBQUUsTUFBRixFQUFVcEQsSUFBVixFQUFnQmtKLFFBQWhCLEVBQTBCQyxNQUExQixFQUFrQ0MsS0FBbEMsRUFBeUNDLEtBQXpDLENBQUY7QUFDQTtBQUNELEtBTkQsTUFNTztBQUNOO0FBQ0E7QUFDRDs7QUFFRHZJLEVBQUFBLENBQUMsQ0FBRUMsUUFBRixDQUFELENBQWNpSSxLQUFkLENBQXFCLFlBQVc7QUFDL0JsSSxJQUFBQSxDQUFDLENBQUUsc0NBQUYsQ0FBRCxDQUE0QzZHLEtBQTVDLENBQW1ELFVBQVVqRCxLQUFWLEVBQWtCO0FBQ3BFLFVBQUkyRSxLQUFLLEdBQUcsRUFBWjs7QUFDQSxVQUFLdkksQ0FBQyxDQUFFLEtBQUYsRUFBU0EsQ0FBQyxDQUFFLElBQUYsQ0FBVixDQUFELENBQXNCcUMsTUFBdEIsR0FBK0IsQ0FBcEMsRUFBd0M7QUFDdkNrRyxRQUFBQSxLQUFLLEdBQUd2SSxDQUFDLENBQUUsS0FBRixFQUFTQSxDQUFDLENBQUUsSUFBRixDQUFWLENBQUQsQ0FBc0I4SCxJQUF0QixDQUE0QixPQUE1QixJQUF3QyxHQUFoRDtBQUNBOztBQUNEUyxNQUFBQSxLQUFLLEdBQUdBLEtBQUssR0FBR3ZJLENBQUMsQ0FBRSxJQUFGLENBQUQsQ0FBVThFLElBQVYsRUFBaEI7QUFDQXFELE1BQUFBLHNDQUFzQyxDQUFFLE9BQUYsRUFBVyxzQkFBWCxFQUFtQyxZQUFZSSxLQUEvQyxFQUFzRDdCLFFBQVEsQ0FBQzhCLFFBQS9ELENBQXRDO0FBQ0EsS0FQRDtBQVFBLEdBVEQ7QUFXQSxDQXhCRCxFQXdCS2xDLE1BeEJMOzs7QUNBQTtBQUNBOztBQUFDLENBQUMsVUFBV3RHLENBQVgsRUFBY3pCLE1BQWQsRUFBc0IwQixRQUF0QixFQUFnQ3pCLGtCQUFoQyxFQUFvRGlLLFNBQXBELEVBQWdFO0FBRWpFO0FBQ0EsTUFBSXZJLFVBQVUsR0FBRyxvQkFBakI7QUFBQSxNQUNBQyxRQUFRLEdBQUc7QUFDVixhQUFVLEtBREE7QUFDTztBQUNqQixxQkFBa0IsWUFGUjtBQUdWLG9DQUFpQyxtQ0FIdkI7QUFJVix5Q0FBc0MsUUFKNUI7QUFLVix3QkFBcUIsNkJBTFg7QUFNViw4QkFBMkIsNEJBTmpCO0FBT1YscUNBQWtDLHVCQVB4QjtBQVFWLHFCQUFrQix1QkFSUjtBQVNWLHFDQUFrQyxpQkFUeEI7QUFVVix3Q0FBcUMsd0JBVjNCO0FBV1YsaUNBQThCO0FBWHBCLEdBRFgsQ0FIaUUsQ0FnQjlEO0FBRUg7O0FBQ0EsV0FBU3FCLE1BQVQsQ0FBaUJDLE9BQWpCLEVBQTBCQyxPQUExQixFQUFvQztBQUVuQyxTQUFLRCxPQUFMLEdBQWVBLE9BQWYsQ0FGbUMsQ0FJbkM7QUFDQTtBQUNBO0FBQ0E7O0FBQ0EsU0FBS0MsT0FBTCxHQUFlMUIsQ0FBQyxDQUFDMkIsTUFBRixDQUFVLEVBQVYsRUFBY3hCLFFBQWQsRUFBd0J1QixPQUF4QixDQUFmO0FBRUEsU0FBS0UsU0FBTCxHQUFpQnpCLFFBQWpCO0FBQ0EsU0FBSzBCLEtBQUwsR0FBYTNCLFVBQWI7QUFFQSxTQUFLNEIsSUFBTDtBQUNBLEdBakNnRSxDQWlDL0Q7OztBQUVGTixFQUFBQSxNQUFNLENBQUMxQyxTQUFQLEdBQW1CO0FBRWxCZ0QsSUFBQUEsSUFBSSxFQUFFLGNBQVU0RyxLQUFWLEVBQWlCMUosTUFBakIsRUFBMEI7QUFDL0I7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBSzJKLGNBQUwsQ0FBcUIsS0FBS2xILE9BQTFCLEVBQW1DLEtBQUtDLE9BQXhDO0FBQ0EsV0FBS2tILFlBQUwsQ0FBbUIsS0FBS25ILE9BQXhCLEVBQWlDLEtBQUtDLE9BQXRDO0FBQ0EsV0FBS21ILGVBQUwsQ0FBc0IsS0FBS3BILE9BQTNCLEVBQW9DLEtBQUtDLE9BQXpDO0FBQ0EsS0FaaUI7QUFjbEJpSCxJQUFBQSxjQUFjLEVBQUUsd0JBQVVsSCxPQUFWLEVBQW1CQyxPQUFuQixFQUE2QjtBQUM1QzFCLE1BQUFBLENBQUMsQ0FBQyw4QkFBRCxFQUFpQ3lCLE9BQWpDLENBQUQsQ0FBMkNvRixLQUEzQyxDQUFpRCxVQUFTaUMsQ0FBVCxFQUFZO0FBQzVELFlBQUlqRixNQUFNLEdBQUc3RCxDQUFDLENBQUM4SSxDQUFDLENBQUNqRixNQUFILENBQWQ7O0FBQ0EsWUFBSUEsTUFBTSxDQUFDb0QsTUFBUCxDQUFjLGdCQUFkLEVBQWdDNUUsTUFBaEMsSUFBMEMsQ0FBMUMsSUFBK0NxRSxRQUFRLENBQUM4QixRQUFULENBQWtCN0MsT0FBbEIsQ0FBMEIsS0FBMUIsRUFBZ0MsRUFBaEMsS0FBdUMsS0FBSzZDLFFBQUwsQ0FBYzdDLE9BQWQsQ0FBc0IsS0FBdEIsRUFBNEIsRUFBNUIsQ0FBdEYsSUFBeUhlLFFBQVEsQ0FBQ3FDLFFBQVQsSUFBcUIsS0FBS0EsUUFBdkosRUFBaUs7QUFDaEssY0FBSWxGLE1BQU0sR0FBRzdELENBQUMsQ0FBQyxLQUFLZ0osSUFBTixDQUFkO0FBQ0FuRixVQUFBQSxNQUFNLEdBQUdBLE1BQU0sQ0FBQ3hCLE1BQVAsR0FBZ0J3QixNQUFoQixHQUF5QjdELENBQUMsQ0FBQyxXQUFXLEtBQUtnSixJQUFMLENBQVVyRixLQUFWLENBQWdCLENBQWhCLENBQVgsR0FBK0IsR0FBaEMsQ0FBbkM7O0FBQ0EsY0FBSUUsTUFBTSxDQUFDeEIsTUFBWCxFQUFtQjtBQUNsQnJDLFlBQUFBLENBQUMsQ0FBQyxXQUFELENBQUQsQ0FBZWlKLE9BQWYsQ0FBdUI7QUFDdEJDLGNBQUFBLFNBQVMsRUFBRXJGLE1BQU0sQ0FBQ3NGLE1BQVAsR0FBZ0JDO0FBREwsYUFBdkIsRUFFRyxJQUZIO0FBR0EsbUJBQU8sS0FBUDtBQUNBO0FBQ0Q7QUFDRCxPQVpEO0FBYUEsS0E1QmlCO0FBNEJmO0FBRUhSLElBQUFBLFlBQVksRUFBRSxzQkFBVW5ILE9BQVYsRUFBbUJDLE9BQW5CLEVBQTZCO0FBQzFDLFVBQUkySCxJQUFJLEdBQUcsSUFBWDtBQUNBLFVBQUlySyxNQUFNLEdBQUcsQ0FBYjtBQUNBLFVBQUlhLEtBQUssR0FBRyxFQUFaO0FBQ0EsVUFBSXlKLFlBQVksR0FBRyxDQUFuQjtBQUNBLFVBQUl0RSxnQkFBZ0IsR0FBRyxFQUF2QjtBQUNBLFVBQUkvRixTQUFTLEdBQUcsRUFBaEI7QUFDQSxVQUFJaUcsY0FBYyxHQUFHLEVBQXJCOztBQUVBLFVBQUtsRixDQUFDLENBQUUwQixPQUFPLENBQUM2SCxnQkFBVixDQUFELENBQThCbEgsTUFBOUIsR0FBdUMsQ0FBNUMsRUFBZ0Q7QUFDL0NyQyxRQUFBQSxDQUFDLENBQUUwQixPQUFPLENBQUM4SCw2QkFBVixFQUF5Qy9ILE9BQXpDLENBQUQsQ0FBb0QyRSxJQUFwRCxDQUF5RCxZQUFXO0FBQ25FcEcsVUFBQUEsQ0FBQyxDQUFFMEIsT0FBTyxDQUFDK0gsYUFBVixFQUF5QnpKLENBQUMsQ0FBQyxJQUFELENBQTFCLENBQUQsQ0FBb0MwSixPQUFwQyxDQUE2Qyx3QkFBN0M7QUFDQSxTQUZEO0FBR0ExSixRQUFBQSxDQUFDLENBQUUwQixPQUFPLENBQUNpSSw0QkFBVixFQUF3Q2xJLE9BQXhDLENBQUQsQ0FBbURtQixFQUFuRCxDQUFzRCxRQUF0RCxFQUFnRSxVQUFVZ0IsS0FBVixFQUFpQjtBQUNoRjBGLFVBQUFBLFlBQVksR0FBR3RKLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUXZCLElBQVIsQ0FBYSxxQkFBYixDQUFmO0FBQ0F1RyxVQUFBQSxnQkFBZ0IsR0FBR2hGLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUXlDLEdBQVIsRUFBbkI7QUFDQXhELFVBQUFBLFNBQVMsR0FBRytGLGdCQUFnQixDQUFDQyxLQUFqQixDQUF1QixLQUF2QixFQUE4QixDQUE5QixDQUFaO0FBQ0FDLFVBQUFBLGNBQWMsR0FBR0YsZ0JBQWdCLENBQUNDLEtBQWpCLENBQXVCLEtBQXZCLEVBQThCLENBQTlCLENBQWpCOztBQUNBLGNBQUssT0FBT3FFLFlBQVAsS0FBd0IsV0FBN0IsRUFBMkM7QUFFMUN0SixZQUFBQSxDQUFDLENBQUUwQixPQUFPLENBQUM4SCw2QkFBVixFQUF5Qy9ILE9BQXpDLENBQUQsQ0FBbURpRCxXQUFuRCxDQUFnRSxTQUFoRTtBQUNBMUUsWUFBQUEsQ0FBQyxDQUFFMEIsT0FBTyxDQUFDa0ksc0JBQVYsRUFBa0NuSSxPQUFsQyxDQUFELENBQTRDaUQsV0FBNUMsQ0FBeUQsUUFBekQ7QUFDQTFFLFlBQUFBLENBQUMsQ0FBRTRELEtBQUssQ0FBQ0MsTUFBUixDQUFELENBQWtCZ0csT0FBbEIsQ0FBMkJuSSxPQUFPLENBQUM4SCw2QkFBbkMsRUFBbUU3RSxRQUFuRSxDQUE2RSxTQUE3RTs7QUFFQSxnQkFBSzFGLFNBQVMsSUFBSSxDQUFsQixFQUFzQjtBQUNyQmUsY0FBQUEsQ0FBQyxDQUFFMEIsT0FBTyxDQUFDb0kseUJBQVYsRUFBcUM5SixDQUFDLENBQUUwQixPQUFPLENBQUNrSSxzQkFBUixHQUFpQyxHQUFqQyxHQUF1Q04sWUFBekMsQ0FBdEMsQ0FBRCxDQUFpRzdHLEdBQWpHLENBQXNHekMsQ0FBQyxDQUFFMEIsT0FBTyxDQUFDcUksYUFBVixFQUF5Qi9KLENBQUMsQ0FBRTBCLE9BQU8sQ0FBQ2tJLHNCQUFSLEdBQWlDLEdBQWpDLEdBQXVDTixZQUF6QyxDQUExQixDQUFELENBQXFGN0ssSUFBckYsQ0FBMEYsZ0JBQTFGLENBQXRHO0FBQ0EsYUFGRCxNQUVPLElBQUtRLFNBQVMsSUFBSSxFQUFsQixFQUF1QjtBQUM3QmUsY0FBQUEsQ0FBQyxDQUFFMEIsT0FBTyxDQUFDb0kseUJBQVYsRUFBcUM5SixDQUFDLENBQUUwQixPQUFPLENBQUNrSSxzQkFBUixHQUFpQyxHQUFqQyxHQUF1Q04sWUFBekMsQ0FBdEMsQ0FBRCxDQUFpRzdHLEdBQWpHLENBQXNHekMsQ0FBQyxDQUFFMEIsT0FBTyxDQUFDcUksYUFBVixFQUF5Qi9KLENBQUMsQ0FBRTBCLE9BQU8sQ0FBQ2tJLHNCQUFSLEdBQWlDLEdBQWpDLEdBQXVDTixZQUF6QyxDQUExQixDQUFELENBQXFGN0ssSUFBckYsQ0FBMEYsaUJBQTFGLENBQXRHO0FBQ0E7O0FBRURPLFlBQUFBLE1BQU0sR0FBR2dCLENBQUMsQ0FBRTBCLE9BQU8sQ0FBQ29JLHlCQUFSLEdBQW9DLDZCQUFwQyxHQUFvRVIsWUFBcEUsR0FBbUYsSUFBckYsQ0FBRCxDQUE0RjdHLEdBQTVGLEVBQVQ7QUFFQTVDLFlBQUFBLEtBQUssR0FBR3dKLElBQUksQ0FBQ3RLLFVBQUwsQ0FBaUJDLE1BQWpCLEVBQXlCQyxTQUF6QixFQUFvQ2lHLGNBQXBDLEVBQW9EekQsT0FBcEQsRUFBNkRDLE9BQTdELENBQVI7QUFDQTJILFlBQUFBLElBQUksQ0FBQ1csZUFBTCxDQUFzQmhGLGdCQUF0QixFQUF3Q25GLEtBQUssQ0FBQyxNQUFELENBQTdDLEVBQXVENEIsT0FBdkQsRUFBZ0VDLE9BQWhFO0FBRUEsV0FqQkQsTUFpQk8sSUFBSzFCLENBQUMsQ0FBRTBCLE9BQU8sQ0FBQ3VJLDZCQUFWLENBQUQsQ0FBMkM1SCxNQUEzQyxHQUFvRCxDQUF6RCxFQUE2RDtBQUNuRXJDLFlBQUFBLENBQUMsQ0FBQzBCLE9BQU8sQ0FBQ3VJLDZCQUFULEVBQXdDeEksT0FBeEMsQ0FBRCxDQUFrRHFELElBQWxELENBQXVESSxjQUF2RDtBQUNBbEYsWUFBQUEsQ0FBQyxDQUFFMEIsT0FBTyxDQUFDa0ksc0JBQVYsQ0FBRCxDQUFvQ3hELElBQXBDLENBQTBDLFlBQVc7QUFDcERrRCxjQUFBQSxZQUFZLEdBQUd0SixDQUFDLENBQUMwQixPQUFPLENBQUNvSSx5QkFBVCxFQUFvQzlKLENBQUMsQ0FBQyxJQUFELENBQXJDLENBQUQsQ0FBOEN2QixJQUE5QyxDQUFtRCxxQkFBbkQsQ0FBZjs7QUFDQSxrQkFBSyxPQUFPNkssWUFBUCxLQUF3QixXQUE3QixFQUEyQztBQUMxQ3RLLGdCQUFBQSxNQUFNLEdBQUdnQixDQUFDLENBQUUwQixPQUFPLENBQUNvSSx5QkFBVixFQUFxQzlKLENBQUMsQ0FBQyxJQUFELENBQXRDLENBQUQsQ0FBZ0R5QyxHQUFoRCxFQUFUO0FBQ0E1QyxnQkFBQUEsS0FBSyxHQUFHd0osSUFBSSxDQUFDdEssVUFBTCxDQUFpQkMsTUFBakIsRUFBeUJDLFNBQXpCLEVBQW9DaUcsY0FBcEMsRUFBb0R6RCxPQUFwRCxFQUE2REMsT0FBN0QsQ0FBUjtBQUNBO0FBQ0QsYUFORDtBQU9BOztBQUVEMkgsVUFBQUEsSUFBSSxDQUFDYSxtQkFBTCxDQUEwQmxGLGdCQUExQixFQUE0Q25GLEtBQUssQ0FBQyxNQUFELENBQWpELEVBQTJENEIsT0FBM0QsRUFBb0VDLE9BQXBFO0FBRUEsU0FuQ0Q7QUFvQ0E7O0FBQ0QsVUFBSzFCLENBQUMsQ0FBRTBCLE9BQU8sQ0FBQ3lJLGdDQUFWLENBQUQsQ0FBOEM5SCxNQUE5QyxHQUF1RCxDQUE1RCxFQUFnRTtBQUMvRHJDLFFBQUFBLENBQUMsQ0FBRTBCLE9BQU8sQ0FBQ3lJLGdDQUFWLEVBQTRDMUksT0FBNUMsQ0FBRCxDQUF1RG9GLEtBQXZELENBQThELFVBQVVqRCxLQUFWLEVBQWtCO0FBQy9FMEYsVUFBQUEsWUFBWSxHQUFHdEosQ0FBQyxDQUFFMEIsT0FBTyxDQUFDaUksNEJBQVYsRUFBd0NsSSxPQUF4QyxDQUFELENBQW1EaEQsSUFBbkQsQ0FBd0QscUJBQXhELENBQWY7QUFDQXVCLFVBQUFBLENBQUMsQ0FBRTBCLE9BQU8sQ0FBQzhILDZCQUFWLEVBQXlDL0gsT0FBekMsQ0FBRCxDQUFtRGlELFdBQW5ELENBQWdFLFNBQWhFO0FBQ0ExRSxVQUFBQSxDQUFDLENBQUUwQixPQUFPLENBQUNrSSxzQkFBVixFQUFrQ25JLE9BQWxDLENBQUQsQ0FBNENpRCxXQUE1QyxDQUF5RCxRQUF6RDtBQUNBMUUsVUFBQUEsQ0FBQyxDQUFFNEQsS0FBSyxDQUFDQyxNQUFSLENBQUQsQ0FBa0JnRyxPQUFsQixDQUEyQm5JLE9BQU8sQ0FBQzhILDZCQUFuQyxFQUFtRTdFLFFBQW5FLENBQTZFLFNBQTdFO0FBQ0FLLFVBQUFBLGdCQUFnQixHQUFHaEYsQ0FBQyxDQUFDMEIsT0FBTyxDQUFDaUksNEJBQVQsRUFBdUMzSixDQUFDLENBQUMsSUFBRCxDQUFELENBQVFpSCxNQUFSLEVBQXZDLENBQUQsQ0FBMkR4RSxHQUEzRCxFQUFuQjtBQUNBeEQsVUFBQUEsU0FBUyxHQUFHK0YsZ0JBQWdCLENBQUNDLEtBQWpCLENBQXVCLEtBQXZCLEVBQThCLENBQTlCLENBQVo7QUFDQWpHLFVBQUFBLE1BQU0sR0FBR2dCLENBQUMsQ0FBRTBCLE9BQU8sQ0FBQ29JLHlCQUFSLEdBQW9DLDZCQUFwQyxHQUFvRVIsWUFBcEUsR0FBbUYsSUFBckYsQ0FBRCxDQUE0RjdHLEdBQTVGLEVBQVQ7QUFDQTVDLFVBQUFBLEtBQUssR0FBR3dKLElBQUksQ0FBQ3RLLFVBQUwsQ0FBaUJDLE1BQWpCLEVBQXlCQyxTQUF6QixFQUFvQ2lHLGNBQXBDLEVBQW9EekQsT0FBcEQsRUFBNkRDLE9BQTdELENBQVI7QUFDQWtDLFVBQUFBLEtBQUssQ0FBQ2tELGNBQU47QUFDQSxTQVZEO0FBV0E7QUFDRCxLQTdGaUI7QUE2RmY7QUFFSC9ILElBQUFBLFVBQVUsRUFBRSxvQkFBVUMsTUFBVixFQUFrQkMsU0FBbEIsRUFBNkJDLElBQTdCLEVBQW1DdUMsT0FBbkMsRUFBNENDLE9BQTVDLEVBQXNEO0FBQ2pFLFVBQUk3QixLQUFLLEdBQUdyQixrQkFBa0IsQ0FBQ08sVUFBbkIsQ0FBK0JDLE1BQS9CLEVBQXVDQyxTQUF2QyxFQUFrREMsSUFBbEQsQ0FBWjtBQUVBYyxNQUFBQSxDQUFDLENBQUMsSUFBRCxFQUFPMEIsT0FBTyxDQUFDOEgsNkJBQWYsQ0FBRCxDQUErQ3BELElBQS9DLENBQXFELFlBQVc7QUFDL0QsWUFBS3BHLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUThFLElBQVIsTUFBa0JqRixLQUFLLENBQUMsTUFBRCxDQUE1QixFQUF1QztBQUN0Q0csVUFBQUEsQ0FBQyxDQUFFMEIsT0FBTyxDQUFDa0ksc0JBQVYsRUFBa0NuSSxPQUFsQyxDQUFELENBQTRDaUQsV0FBNUMsQ0FBeUQsUUFBekQ7QUFDQTFFLFVBQUFBLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUWlILE1BQVIsR0FBaUJBLE1BQWpCLEdBQTBCdEMsUUFBMUIsQ0FBb0MsUUFBcEM7QUFDQTtBQUNELE9BTEQ7QUFPQSxhQUFPOUUsS0FBUDtBQUNBLEtBMUdpQjtBQTBHZjtBQUVIbUssSUFBQUEsZUFBZSxFQUFFLHlCQUFVSSxRQUFWLEVBQW9CdkssS0FBcEIsRUFBMkI0QixPQUEzQixFQUFvQ0MsT0FBcEMsRUFBOEM7QUFDOUQxQixNQUFBQSxDQUFDLENBQUUwQixPQUFPLENBQUM4SCw2QkFBVixDQUFELENBQTJDcEQsSUFBM0MsQ0FBaUQsWUFBVztBQUMzRCxZQUFJaUUsS0FBSyxHQUFZckssQ0FBQyxDQUFFMEIsT0FBTyxDQUFDcUksYUFBVixFQUF5Qi9KLENBQUMsQ0FBQyxJQUFELENBQTFCLENBQUQsQ0FBb0M4RSxJQUFwQyxFQUFyQjtBQUNBLFlBQUl3RixXQUFXLEdBQU10SyxDQUFDLENBQUUwQixPQUFPLENBQUNxSSxhQUFWLEVBQXlCL0osQ0FBQyxDQUFDLElBQUQsQ0FBMUIsQ0FBRCxDQUFvQ3ZCLElBQXBDLENBQXlDLE9BQXpDLENBQXJCO0FBQ0EsWUFBSThMLFVBQVUsR0FBT3ZLLENBQUMsQ0FBRTBCLE9BQU8sQ0FBQ3FJLGFBQVYsRUFBeUIvSixDQUFDLENBQUMsSUFBRCxDQUExQixDQUFELENBQW9DdkIsSUFBcEMsQ0FBeUMsTUFBekMsQ0FBckI7QUFDQSxZQUFJK0wsVUFBVSxHQUFPeEssQ0FBQyxDQUFFMEIsT0FBTyxDQUFDcUksYUFBVixFQUF5Qi9KLENBQUMsQ0FBQyxJQUFELENBQTFCLENBQUQsQ0FBb0N2QixJQUFwQyxDQUF5QyxVQUF6QyxDQUFyQjtBQUNBLFlBQUl5RyxjQUFjLEdBQUdrRixRQUFRLENBQUNuRixLQUFULENBQWUsS0FBZixFQUFzQixDQUF0QixDQUFyQjtBQUNBLFlBQUloRyxTQUFTLEdBQVFHLFFBQVEsQ0FBRWdMLFFBQVEsQ0FBQ25GLEtBQVQsQ0FBZSxLQUFmLEVBQXNCLENBQXRCLENBQUYsQ0FBN0I7QUFFQWpGLFFBQUFBLENBQUMsQ0FBRTBCLE9BQU8sQ0FBQ2lJLDRCQUFWLENBQUQsQ0FBMENsSCxHQUExQyxDQUErQzJILFFBQS9DO0FBQ0FwSyxRQUFBQSxDQUFDLENBQUUwQixPQUFPLENBQUNpSSw0QkFBVixDQUFELENBQTBDeEcsSUFBMUMsQ0FBZ0QsVUFBaEQsRUFBNERpSCxRQUE1RDs7QUFFQSxZQUFLbEYsY0FBYyxJQUFJLFdBQXZCLEVBQXFDO0FBQ3BDbUYsVUFBQUEsS0FBSyxHQUFHQyxXQUFSO0FBQ0F0SyxVQUFBQSxDQUFDLENBQUUwQixPQUFPLENBQUNxSSxhQUFWLEVBQXlCL0osQ0FBQyxDQUFDLElBQUQsQ0FBMUIsQ0FBRCxDQUFvQzBFLFdBQXBDLENBQWlELFNBQWpEO0FBQ0EsU0FIRCxNQUdPLElBQUtRLGNBQWMsSUFBSSxVQUF2QixFQUFvQztBQUMxQ21GLFVBQUFBLEtBQUssR0FBR0UsVUFBUjtBQUNBdkssVUFBQUEsQ0FBQyxDQUFFMEIsT0FBTyxDQUFDcUksYUFBVixFQUF5Qi9KLENBQUMsQ0FBQyxJQUFELENBQTFCLENBQUQsQ0FBb0MyRSxRQUFwQyxDQUE4QyxTQUE5QztBQUNBLFNBSE0sTUFHQSxJQUFJTyxjQUFjLElBQUksVUFBdEIsRUFBbUM7QUFDekNtRixVQUFBQSxLQUFLLEdBQUdHLFVBQVI7QUFDQXhLLFVBQUFBLENBQUMsQ0FBRTBCLE9BQU8sQ0FBQ3FJLGFBQVYsRUFBeUIvSixDQUFDLENBQUMsSUFBRCxDQUExQixDQUFELENBQW9DMkUsUUFBcEMsQ0FBNkMsU0FBN0M7QUFDQTs7QUFFRDNFLFFBQUFBLENBQUMsQ0FBRTBCLE9BQU8sQ0FBQ3FJLGFBQVYsRUFBeUIvSixDQUFDLENBQUMsSUFBRCxDQUExQixDQUFELENBQW9DOEUsSUFBcEMsQ0FBMEN1RixLQUExQztBQUNBckssUUFBQUEsQ0FBQyxDQUFFMEIsT0FBTyxDQUFDaUksNEJBQVYsRUFBd0MzSixDQUFDLENBQUMsSUFBRCxDQUF6QyxDQUFELENBQW1EdkIsSUFBbkQsQ0FBeUQsV0FBekQsRUFBc0VRLFNBQXRFO0FBRUEsT0F6QkQ7QUEwQkEsS0F2SWlCO0FBdUlmO0FBRUhpTCxJQUFBQSxtQkFBbUIsRUFBRSw2QkFBVUUsUUFBVixFQUFvQnZLLEtBQXBCLEVBQTJCNEIsT0FBM0IsRUFBb0NDLE9BQXBDLEVBQThDO0FBQ2xFMUIsTUFBQUEsQ0FBQyxDQUFFMEIsT0FBTyxDQUFDOEgsNkJBQVYsQ0FBRCxDQUEyQ3BELElBQTNDLENBQWlELFlBQVc7QUFDM0QsWUFBSWlFLEtBQUssR0FBWXJLLENBQUMsQ0FBRTBCLE9BQU8sQ0FBQ3FJLGFBQVYsRUFBeUIvSixDQUFDLENBQUMsSUFBRCxDQUExQixDQUFELENBQW9DOEUsSUFBcEMsRUFBckI7QUFDQSxZQUFJd0YsV0FBVyxHQUFNdEssQ0FBQyxDQUFFMEIsT0FBTyxDQUFDcUksYUFBVixFQUF5Qi9KLENBQUMsQ0FBQyxJQUFELENBQTFCLENBQUQsQ0FBb0N2QixJQUFwQyxDQUF5QyxPQUF6QyxDQUFyQjtBQUNBLFlBQUk4TCxVQUFVLEdBQU92SyxDQUFDLENBQUUwQixPQUFPLENBQUNxSSxhQUFWLEVBQXlCL0osQ0FBQyxDQUFDLElBQUQsQ0FBMUIsQ0FBRCxDQUFvQ3ZCLElBQXBDLENBQXlDLE1BQXpDLENBQXJCO0FBQ0EsWUFBSStMLFVBQVUsR0FBT3hLLENBQUMsQ0FBRTBCLE9BQU8sQ0FBQ3FJLGFBQVYsRUFBeUIvSixDQUFDLENBQUMsSUFBRCxDQUExQixDQUFELENBQW9DdkIsSUFBcEMsQ0FBeUMsVUFBekMsQ0FBckI7QUFDQSxZQUFJeUcsY0FBYyxHQUFHa0YsUUFBUSxDQUFDbkYsS0FBVCxDQUFlLEtBQWYsRUFBc0IsQ0FBdEIsQ0FBckI7O0FBRUEsWUFBS0MsY0FBYyxJQUFJLFdBQXZCLEVBQXFDO0FBQ3BDbUYsVUFBQUEsS0FBSyxHQUFHQyxXQUFSO0FBQ0F0SyxVQUFBQSxDQUFDLENBQUUwQixPQUFPLENBQUNxSSxhQUFWLEVBQXlCL0osQ0FBQyxDQUFDLElBQUQsQ0FBMUIsQ0FBRCxDQUFvQzBFLFdBQXBDLENBQWlELFNBQWpEO0FBQ0EsU0FIRCxNQUdPLElBQUtRLGNBQWMsSUFBSSxVQUF2QixFQUFvQztBQUMxQ21GLFVBQUFBLEtBQUssR0FBR0UsVUFBUjtBQUNBdkssVUFBQUEsQ0FBQyxDQUFFMEIsT0FBTyxDQUFDcUksYUFBVixFQUF5Qi9KLENBQUMsQ0FBQyxJQUFELENBQTFCLENBQUQsQ0FBb0MyRSxRQUFwQyxDQUE4QyxTQUE5QztBQUNBLFNBSE0sTUFHQSxJQUFJTyxjQUFjLElBQUksVUFBdEIsRUFBbUM7QUFDekNtRixVQUFBQSxLQUFLLEdBQUdHLFVBQVI7QUFDQXhLLFVBQUFBLENBQUMsQ0FBRTBCLE9BQU8sQ0FBQ3FJLGFBQVYsRUFBeUIvSixDQUFDLENBQUMsSUFBRCxDQUExQixDQUFELENBQW9DMkUsUUFBcEMsQ0FBNkMsU0FBN0M7QUFDQTs7QUFFRDNFLFFBQUFBLENBQUMsQ0FBRTBCLE9BQU8sQ0FBQ3FJLGFBQVYsRUFBeUIvSixDQUFDLENBQUMsSUFBRCxDQUExQixDQUFELENBQW9DOEUsSUFBcEMsQ0FBMEN1RixLQUExQztBQUVBLE9BcEJEO0FBcUJBLEtBL0ppQjtBQStKZjtBQUVIeEIsSUFBQUEsZUFBZSxFQUFFLHlCQUFVcEgsT0FBVixFQUFtQkMsT0FBbkIsRUFBNkI7QUFDN0MxQixNQUFBQSxDQUFDLENBQUMsY0FBRCxDQUFELENBQWtCNkcsS0FBbEIsQ0FBd0IsWUFBVztBQUNsQyxZQUFJNEQsV0FBVyxHQUFHekssQ0FBQyxDQUFFLElBQUYsQ0FBRCxDQUFVbUQsSUFBVixDQUFnQixPQUFoQixDQUFsQjtBQUNBLFlBQUltRyxZQUFZLEdBQUdtQixXQUFXLENBQUNBLFdBQVcsQ0FBQ3BJLE1BQVosR0FBb0IsQ0FBckIsQ0FBOUI7QUFDQXJDLFFBQUFBLENBQUMsQ0FBRTBCLE9BQU8sQ0FBQzhILDZCQUFWLEVBQXlDL0gsT0FBekMsQ0FBRCxDQUFtRGlELFdBQW5ELENBQWdFLFNBQWhFO0FBQ0ExRSxRQUFBQSxDQUFDLENBQUUwQixPQUFPLENBQUNrSSxzQkFBVixFQUFrQ25JLE9BQWxDLENBQUQsQ0FBNENpRCxXQUE1QyxDQUF5RCxRQUF6RDtBQUNBMUUsUUFBQUEsQ0FBQyxDQUFFMEIsT0FBTyxDQUFDa0ksc0JBQVIsR0FBaUMsR0FBakMsR0FBdUNOLFlBQXpDLEVBQXVEN0gsT0FBdkQsQ0FBRCxDQUFrRWtELFFBQWxFLENBQTRFLFFBQTVFO0FBQ0EzRSxRQUFBQSxDQUFDLENBQUUwQixPQUFPLENBQUNrSSxzQkFBUixHQUFpQyxHQUFqQyxHQUF1Q04sWUFBdkMsR0FBc0QsR0FBdEQsR0FBNEQ1SCxPQUFPLENBQUM4SCw2QkFBdEUsQ0FBRCxDQUF1RzdFLFFBQXZHLENBQWlILFNBQWpIO0FBQ0EsT0FQRDtBQVFBLEtBMUtpQixDQTBLZjs7QUExS2UsR0FBbkIsQ0FuQ2lFLENBK005RDtBQUVIO0FBQ0E7O0FBQ0EzRSxFQUFBQSxDQUFDLENBQUNxRyxFQUFGLENBQUtuRyxVQUFMLElBQW1CLFVBQVd3QixPQUFYLEVBQXFCO0FBQ3ZDLFdBQU8sS0FBSzBFLElBQUwsQ0FBVSxZQUFZO0FBQzVCLFVBQUssQ0FBRXBHLENBQUMsQ0FBQ3ZCLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXlCLFVBQTFCLENBQVAsRUFBZ0Q7QUFDL0NGLFFBQUFBLENBQUMsQ0FBQ3ZCLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXlCLFVBQTFCLEVBQXNDLElBQUlzQixNQUFKLENBQVksSUFBWixFQUFrQkUsT0FBbEIsQ0FBdEM7QUFDQTtBQUNELEtBSk0sQ0FBUDtBQUtBLEdBTkQ7QUFRQSxDQTNOQSxFQTJORzRFLE1BM05ILEVBMk5XL0gsTUEzTlgsRUEyTm1CMEIsUUEzTm5CLEVBMk42QnpCLGtCQTNON0I7OztBQ0REO0FBQ0E7O0FBQUMsQ0FBQyxVQUFXd0IsQ0FBWCxFQUFjekIsTUFBZCxFQUFzQjBCLFFBQXRCLEVBQWlDO0FBQ2xDO0FBQ0EsTUFBSUMsVUFBVSxHQUFHLHFCQUFqQjtBQUFBLE1BQ0FDLFFBQVEsR0FBRztBQUNWakIsSUFBQUEsSUFBSSxFQUFFLE9BREk7QUFFVmtKLElBQUFBLFFBQVEsRUFBRSxZQUZBO0FBR1ZDLElBQUFBLE1BQU0sRUFBRSxpQkFIRTtBQUlWQyxJQUFBQSxLQUFLLEVBQUU1QixRQUFRLENBQUM4QjtBQUpOLEdBRFgsQ0FGa0MsQ0FVbEM7O0FBQ0EsV0FBU2hILE1BQVQsQ0FBaUJDLE9BQWpCLEVBQTBCQyxPQUExQixFQUFvQztBQUNuQyxTQUFLRCxPQUFMLEdBQWVBLE9BQWYsQ0FEbUMsQ0FHbkM7QUFDQTtBQUNBO0FBQ0E7O0FBQ0EsU0FBS0MsT0FBTCxHQUFlMUIsQ0FBQyxDQUFDMkIsTUFBRixDQUFVLEVBQVYsRUFBY3hCLFFBQWQsRUFBd0J1QixPQUF4QixDQUFmO0FBRUEsU0FBS0UsU0FBTCxHQUFpQnpCLFFBQWpCO0FBQ0EsU0FBSzBCLEtBQUwsR0FBYTNCLFVBQWI7QUFFQSxTQUFLNEIsSUFBTDtBQUNBLEdBeEJpQyxDQXdCaEM7OztBQUVGTixFQUFBQSxNQUFNLENBQUMxQyxTQUFQLEdBQW1CO0FBQ2xCZ0QsSUFBQUEsSUFBSSxFQUFFLGdCQUFZO0FBQ2pCLFVBQUl1SCxJQUFJLEdBQUcsSUFBWDtBQUNBLFVBQUkzSCxPQUFPLEdBQUcsS0FBS0EsT0FBbkI7QUFFQTFCLE1BQUFBLENBQUMsQ0FBRSxLQUFLeUIsT0FBUCxDQUFELENBQWtCaUosTUFBbEIsQ0FBMEIsVUFBVTlHLEtBQVYsRUFBa0I7QUFDM0M7QUFDQTtBQUNBeUYsUUFBQUEsSUFBSSxDQUFDc0IsbUJBQUwsQ0FDQ2pKLE9BQU8sQ0FBQ3hDLElBRFQsRUFFQ3dDLE9BQU8sQ0FBQzBHLFFBRlQsRUFHQzFHLE9BQU8sQ0FBQzJHLE1BSFQsRUFJQzNHLE9BQU8sQ0FBQzRHLEtBSlQsRUFIMkMsQ0FTM0M7O0FBQ0FlLFFBQUFBLElBQUksQ0FBQ3VCLHVCQUFMLENBQThCNUssQ0FBQyxDQUFFcUosSUFBSSxDQUFDNUgsT0FBUCxDQUEvQjtBQUNBLE9BWEQ7QUFZQSxLQWpCaUI7QUFtQmxCa0osSUFBQUEsbUJBQW1CLEVBQUUsNkJBQVV6TCxJQUFWLEVBQWdCa0osUUFBaEIsRUFBMEJDLE1BQTFCLEVBQWtDQyxLQUFsQyxFQUF5Q0MsS0FBekMsRUFBaUQ7QUFDckUsVUFBSyxPQUFPakcsRUFBUCxLQUFjLFdBQW5CLEVBQWlDO0FBQ2hDO0FBQ0E7O0FBRUQsVUFBSyxPQUFPaUcsS0FBUCxLQUFpQixXQUF0QixFQUFvQztBQUNuQ2pHLFFBQUFBLEVBQUUsQ0FBRSxNQUFGLEVBQVVwRCxJQUFWLEVBQWdCa0osUUFBaEIsRUFBMEJDLE1BQTFCLEVBQWtDQyxLQUFsQyxDQUFGO0FBQ0E7QUFDQTs7QUFFRGhHLE1BQUFBLEVBQUUsQ0FBRSxNQUFGLEVBQVVwRCxJQUFWLEVBQWdCa0osUUFBaEIsRUFBMEJDLE1BQTFCLEVBQWtDQyxLQUFsQyxFQUF5Q0MsS0FBekMsQ0FBRjtBQUNBLEtBOUJpQjtBQThCZjtBQUVIcUMsSUFBQUEsdUJBQXVCLEVBQUUsaUNBQVVuSixPQUFWLEVBQW9CO0FBQzVDLFVBQUssT0FBT2EsRUFBUCxLQUFjLFdBQW5CLEVBQWlDO0FBQ2hDO0FBQ0E7O0FBQ0RBLE1BQUFBLEVBQUUsQ0FBRSxTQUFGLEVBQWEsSUFBYixDQUFGOztBQUNBLFVBQUtiLE9BQU8sQ0FBQ29KLFFBQVIsQ0FBa0IsMkJBQWxCLENBQUwsRUFBdUQ7QUFDdER2SSxRQUFBQSxFQUFFLENBQUUsY0FBRixFQUFrQixVQUFsQixFQUE4QjtBQUMvQixrQkFBUTtBQUR1QixTQUE5QixDQUFGO0FBR0E7QUFDRCxLQTFDaUIsQ0EwQ2Y7O0FBMUNlLEdBQW5CLENBMUJrQyxDQXNFL0I7QUFHSDtBQUNBOztBQUNBdEMsRUFBQUEsQ0FBQyxDQUFDcUcsRUFBRixDQUFLbkcsVUFBTCxJQUFtQixVQUFXd0IsT0FBWCxFQUFxQjtBQUN2QyxXQUFPLEtBQUswRSxJQUFMLENBQVUsWUFBWTtBQUM1QixVQUFLLENBQUVwRyxDQUFDLENBQUN2QixJQUFGLENBQVEsSUFBUixFQUFjLFlBQVl5QixVQUExQixDQUFQLEVBQWdEO0FBQy9DRixRQUFBQSxDQUFDLENBQUN2QixJQUFGLENBQVEsSUFBUixFQUFjLFlBQVl5QixVQUExQixFQUFzQyxJQUFJc0IsTUFBSixDQUFZLElBQVosRUFBa0JFLE9BQWxCLENBQXRDO0FBQ0E7QUFDRCxLQUpNLENBQVA7QUFLQSxHQU5EO0FBT0EsQ0FsRkEsRUFrRkc0RSxNQWxGSCxFQWtGVy9ILE1BbEZYLEVBa0ZtQjBCLFFBbEZuQiIsImZpbGUiOiJtaW5ucG9zdC1tZW1iZXJzaGlwLWZyb250LWVuZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIjsoZnVuY3Rpb24gKCB3aW5kb3cgKSB7XG5cdGZ1bmN0aW9uIE1pbm5Qb3N0TWVtYmVyc2hpcCggZGF0YSwgc2V0dGluZ3MgKSB7XG5cdFx0dGhpcy5kYXRhID0ge307XG5cdFx0aWYgKHR5cGVvZiBkYXRhICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5kYXRhID0gZGF0YTtcblx0XHR9XG5cblx0XHR0aGlzLnNldHRpbmdzID0ge307XG5cdFx0aWYgKHR5cGVvZiBzZXR0aW5ncyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcblx0XHR9XG5cblx0XHR0aGlzLnByZXZpb3VzQW1vdW50ID0gJyc7XG5cdFx0aWYgKCB0eXBlb2YgdGhpcy5kYXRhLmN1cnJlbnRfdXNlciAhPT0gJ3VuZGVmaW5lZCcgJiZcblx0XHQgICAgIHR5cGVvZiB0aGlzLmRhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHR0aGlzLnByZXZpb3VzQW1vdW50ID0gdGhpcy5kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQ7XG5cdFx0fVxuXHR9XG5cblx0TWlublBvc3RNZW1iZXJzaGlwLnByb3RvdHlwZSA9IHtcblx0XHRjaGVja0xldmVsOiBmdW5jdGlvbiggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUgKSB7XG5cdFx0XHR2YXIgdGhpc3llYXIgPSBwYXJzZUludCggYW1vdW50ICkgKiBwYXJzZUludCggZnJlcXVlbmN5ICk7XG5cdFx0XHRpZiAoIHR5cGVvZiB0aGlzLnByZXZpb3VzQW1vdW50ICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLnByZXZpb3VzQW1vdW50ICE9PSAnJyApIHtcblx0XHRcdFx0dmFyIHByaW9yX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHRoaXMucHJldmlvdXNBbW91bnQucHJpb3JfeWVhcl9jb250cmlidXRpb25zLCAxMCApO1xuXHRcdFx0XHR2YXIgY29taW5nX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHRoaXMucHJldmlvdXNBbW91bnQuY29taW5nX3llYXJfY29udHJpYnV0aW9ucywgMTAgKTtcblx0XHRcdFx0dmFyIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ID0gcGFyc2VJbnQoIHRoaXMucHJldmlvdXNBbW91bnQuYW5udWFsX3JlY3VycmluZ19hbW91bnQsIDEwICk7XG5cdFx0XHRcdC8vIGNhbGN1bGF0ZSBtZW1iZXIgbGV2ZWwgZm9ybXVsYVxuXHRcdFx0XHRpZiAoIHR5cGUgPT09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cHJpb3JfeWVhcl9hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0YW5udWFsX3JlY3VycmluZ19hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGlzeWVhciA9IE1hdGgubWF4KCBwcmlvcl95ZWFyX2Ftb3VudCwgY29taW5nX3llYXJfYW1vdW50LCBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRMZXZlbCggdGhpc3llYXIgKTtcblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Z2V0TGV2ZWw6IGZ1bmN0aW9uKCB0aGlzeWVhciApIHtcblx0XHRcdHZhciBsZXZlbCA9IHtcblx0XHRcdFx0J3llYXJseUFtb3VudCc6IHRoaXN5ZWFyXG5cdFx0XHR9O1xuXHRcdFx0aWYgKCB0aGlzeWVhciA+IDAgJiYgdGhpc3llYXIgPCA2MCApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdCcm9uemUnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAxO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodGhpc3llYXIgPiA1OSAmJiB0aGlzeWVhciA8IDEyMCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1NpbHZlcic7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDI7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMTE5ICYmIHRoaXN5ZWFyIDwgMjQwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnR29sZCc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDM7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMjM5KSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnUGxhdGludW0nO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSA0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBnZXRMZXZlbFxuXHR9O1xuXG5cdHdpbmRvdy5NaW5uUG9zdE1lbWJlcnNoaXAgPSBuZXcgTWlublBvc3RNZW1iZXJzaGlwKFxuXHRcdHdpbmRvdy5taW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEsXG5cdFx0d2luZG93Lm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3Ncblx0KTtcbn0pKCB3aW5kb3cgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCApIHtcblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0QW1vdW50U2VsZWN0Jyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0ZnJlcXVlbmN5U2VsZWN0b3I6ICcubS1mcmVxdWVuY3ktc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0YW1vdW50R3JvdXA6ICcubS1mcmVxdWVuY3ktZ3JvdXAnLFxuXHRcdGFtb3VudFNlbGVjdG9yOiAnLm0tYW1vdW50LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGFtb3VudExhYmVsczogJy5tLWFtb3VudC1zZWxlY3QgbGFiZWwnLFxuXHRcdGFtb3VudFZhbHVlOiAnc3Ryb25nJyxcblx0XHRhbW91bnREZXNjcmlwdGlvbjogJy5hLWFtb3VudC1kZXNjcmlwdGlvbicsXG5cdFx0YW1vdW50RmllbGQ6ICcuYS1hbW91bnQtZmllbGQgI2Ftb3VudCcsXG5cdFx0Y3VzdG9tQW1vdW50RnJlcXVlbmN5OiAnI2Ftb3VudC1pdGVtIC5hLWZyZXF1ZW5jeS10ZXh0LWxhYmVsJyxcblx0XHRsZXZlbFZpZXdlcjogJy5hLXNob3ctbGV2ZWwnLFxuXHRcdGxldmVsTmFtZTogJy5hLWxldmVsJyxcblx0XHR1c2VyQ3VycmVudExldmVsOiAnLmEtY3VycmVudC1sZXZlbCcsXG5cdFx0ZGVjbGluZUJlbmVmaXRzOiAnLm0tZGVjbGluZS1iZW5lZml0cy1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRnaWZ0U2VsZWN0aW9uR3JvdXA6ICcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3InLFxuXHRcdHN3YWdFbGlnaWJpbGl0eVRleHQ6ICcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3IgLnN3YWctZWxpZ2liaWxpdHknLFxuXHRcdHN3YWdTZWxlY3RvcjogJy5tLXNlbGVjdC1zd2FnIGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0c3dhZ0xhYmVsczogJy5tLXNlbGVjdC1zd2FnIGlucHV0W3R5cGU9XCJyYWRpb1wiXSArIGxhYmVsJyxcblx0XHRzdWJzY3JpcHRpb25zU2VsZWN0b3I6ICcubS1zZWxlY3Qtc3Vic2NyaXB0aW9uIGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0c3Vic2NyaXB0aW9uc0xhYmVsczogJy5tLXNlbGVjdC1zdWJzY3JpcHRpb24gaW5wdXRbdHlwZT1cInJhZGlvXCJdICsgbGFiZWwnLFxuXHRcdG1pbkFtb3VudHM6ICcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3IgLm1pbi1hbW91bnQnLFxuXHRcdGRlY2xpbmVTdWJzY3JpcHRpb25zOiAnI3N1YnNjcmlwdGlvbi1kZWNsaW5lJ1xuXHR9O1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cdFx0aW5pdDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgJGZyZXF1ZW5jeSA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciApO1xuXHRcdFx0dmFyICRzdWdnZXN0ZWRBbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKTtcblx0XHRcdHZhciAkYW1vdW50ID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICk7XG5cdFx0XHR2YXIgJGRlY2xpbmVCZW5lZml0cyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lQmVuZWZpdHMgKTtcblx0XHRcdHZhciAkc3Vic2NyaXB0aW9ucyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5zdWJzY3JpcHRpb25zU2VsZWN0b3IgKTtcblx0XHRcdGlmICggISggJGFtb3VudC5sZW5ndGggPiAwICYmXG5cdFx0XHQgICAgICAgICRmcmVxdWVuY3kubGVuZ3RoID4gMCAmJlxuXHRcdFx0ICAgICAgICAkc3VnZ2VzdGVkQW1vdW50Lmxlbmd0aCA+IDAgKSApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzZXR1cCBBbmFseXRpY3MgRW5oYW5jZWQgRWNvbW1lcmNlIHBsdWdpblxuXHRcdFx0aWYgKCB0eXBlb2YgZ2EgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRnYSggJ3JlcXVpcmUnLCAnZWMnICk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNldCB1cCB0aGUgVUkgZm9yIHRoZSBjdXJyZW50IGZpZWxkIHN0YXRlIG9uIChyZS0pbG9hZFxuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoICRmcmVxdWVuY3kuZmlsdGVyKCc6Y2hlY2tlZCcpLnZhbCgpICk7XG5cdFx0XHR0aGlzLnNldE1pbkFtb3VudHMoICRmcmVxdWVuY3kuZmlsdGVyKCc6Y2hlY2tlZCcpLnZhbCgpICk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoKTtcblxuXHRcdFx0JGZyZXF1ZW5jeS5vbiggJ2NoYW5nZScsIHRoaXMub25GcmVxdWVuY3lDaGFuZ2UuYmluZCh0aGlzKSApO1xuXHRcdFx0JHN1Z2dlc3RlZEFtb3VudC5vbiggJ2NoYW5nZScsIHRoaXMub25TdWdnZXN0ZWRBbW91bnRDaGFuZ2UuYmluZCh0aGlzKSApO1xuXHRcdFx0JGFtb3VudC5vbiggJ2tleXVwIG1vdXNldXAnLCB0aGlzLm9uQW1vdW50Q2hhbmdlLmJpbmQodGhpcykgKTtcblxuXHRcdFx0aWYgKCAhICggJGRlY2xpbmVCZW5lZml0cy5sZW5ndGggPiAwICYmICRzdWJzY3JpcHRpb25zLmxlbmd0aCA+IDAgKSApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTZXQgdXAgdGhlIFVJIGZvciB0aGUgY3VycmVudCBmaWVsZCBzdGF0ZSBvbiAocmUtKWxvYWRcblx0XHRcdGlmICggJHN1YnNjcmlwdGlvbnMubm90KCB0aGlzLm9wdGlvbnMuZGVjbGluZVN1YnNjcmlwdGlvbnMgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHQkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZGVjbGluZVN1YnNjcmlwdGlvbnMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLm9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlKCk7XG5cblx0XHRcdCRkZWNsaW5lQmVuZWZpdHMub24oICdjaGFuZ2UnLCB0aGlzLm9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlLmJpbmQoIHRoaXMgKSApO1xuXHRcdFx0JHN1YnNjcmlwdGlvbnMub24oICdjbGljaycsIHRoaXMub25TdWJzY3JpcHRpb25zQ2xpY2suYmluZCggdGhpcyApICk7XG5cdFx0fSwgLy8gZW5kIGluaXRcblxuXHRcdCAvLyBzdGVwIGlzIHRoZSBpbnRlZ2VyIGZvciB0aGUgc3RlcCBpbiB0aGUgZWNvbW1lcmNlIHByb2Nlc3MuXG5cdFx0IC8vIGZvciB0aGlzIHB1cnBvc2UsIGl0J3MgcHJvYmFibHkgYWx3YXlzIDEuXG5cdFx0IC8vIHRoaW5ncyB3ZSBuZWVkIHRvIGtub3c6IHRoZSBsZXZlbCBuYW1lLCB0aGUgYW1vdW50LCBhbmQgdGhlIGZyZXF1ZW5jeVxuXHRcdCAvLyBleGFtcGxlOlxuXHRcdCAvKlxuXHRcdCBSdW5uaW5nIGNvbW1hbmQ6IGdhKFwiZWM6YWRkUHJvZHVjdFwiLCB7aWQ6IFwibWlubnBvc3Rfc2lsdmVyX21lbWJlcnNoaXBcIiwgbmFtZTogXCJNaW5uUG9zdCBTaWx2ZXIgTWVtYmVyc2hpcFwiLCBjYXRlZ29yeTogXCJEb25hdGlvblwiLCBicmFuZDogXCJNaW5uUG9zdFwiLCB2YXJpYW50OiBcIk1vbnRobHlcIiwgcHJpY2U6IFwiNVwiLCBxdWFudGl0eTogMX0pXG5cdFx0ICovXG5cdFx0YW5hbHl0aWNzVHJhY2tlcjogZnVuY3Rpb24oIGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCApIHtcblx0XHRcdGlmICggdHlwZW9mIGdhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0Z2EoICdlYzphZGRQcm9kdWN0Jywge1xuXHRcdFx0XHRcdCdpZCc6ICdtaW5ucG9zdF8nICsgbGV2ZWwudG9Mb3dlckNhc2UoKSArICdfbWVtYmVyc2hpcCcsXG5cdFx0XHRcdFx0J25hbWUnOiAnTWlublBvc3QgJyArIGxldmVsLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgbGV2ZWwuc2xpY2UoMSkgKyAnIE1lbWJlcnNoaXAnLFxuXHRcdFx0XHRcdCdjYXRlZ29yeSc6ICdEb25hdGlvbicsXG5cdFx0XHRcdFx0J2JyYW5kJzogJ01pbm5Qb3N0Jyxcblx0XHRcdFx0XHQndmFyaWFudCc6ICBmcmVxdWVuY3lfbGFiZWwsXG5cdFx0XHRcdFx0J3ByaWNlJzogYW1vdW50LFxuXHRcdFx0XHRcdCdxdWFudGl0eSc6IDFcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGFuYWx5dGljc1RyYWNrZXJcblxuXHRcdG9uRnJlcXVlbmN5Q2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR0aGlzLnNldEFtb3VudExhYmVscyggJCggZXZlbnQudGFyZ2V0ICkudmFsKCkgKTtcblx0XHRcdHRoaXMuc2V0TWluQW1vdW50cyggJCggZXZlbnQudGFyZ2V0ICkudmFsKCkgKTtcblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCgpO1xuXHRcdH0sIC8vIGVuZCBvbkZyZXF1ZW5jeUNoYW5nZVxuXG5cdFx0b25TdWdnZXN0ZWRBbW91bnRDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdCQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCApLnZhbCggbnVsbCApO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCk7XG5cdFx0fSwgLy8gZW5kIG9uU3VnZ2VzdGVkQW1vdW50Q2hhbmdlXG5cblx0XHRvbkFtb3VudENoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dGhpcy5jbGVhckFtb3VudFNlbGVjdG9yKCBldmVudCApO1xuXG5cdFx0XHR2YXIgJHRhcmdldCA9ICQoIGV2ZW50LnRhcmdldCApO1xuXHRcdFx0aWYgKCAkdGFyZ2V0LmRhdGEoICdsYXN0LXZhbHVlJyApICE9ICR0YXJnZXQudmFsKCkgKSB7XG5cdFx0XHRcdCR0YXJnZXQuZGF0YSggJ2xhc3QtdmFsdWUnLCAkdGFyZ2V0LnZhbCgpICk7XG5cdFx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCgpO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBvbkFtb3VudENoYW5nZVxuXG5cdFx0b25EZWNsaW5lQmVuZWZpdHNDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciAkZ2lmdFNlbGVjdGlvbkdyb3VwID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmdpZnRTZWxlY3Rpb25Hcm91cCApO1xuXHRcdFx0dmFyIGRlY2xpbmUgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZGVjbGluZUJlbmVmaXRzICkuZmlsdGVyKCAnOmNoZWNrZWQnICkudmFsKCk7XG5cblx0XHRcdGlmICggZGVjbGluZSA9PT0gJ3RydWUnICkge1xuXHRcdFx0XHQkZ2lmdFNlbGVjdGlvbkdyb3VwLmhpZGUoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQkZ2lmdFNlbGVjdGlvbkdyb3VwLnNob3coKTtcblx0XHR9LCAvLyBlbmQgb25EZWNsaW5lQmVuZWZpdHNDaGFuZ2VcblxuXHRcdG9uU3Vic2NyaXB0aW9uc0NsaWNrOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgJHN1YnNjcmlwdGlvbnMgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuc3Vic2NyaXB0aW9uc1NlbGVjdG9yICkubm90KCB0aGlzLm9wdGlvbnMuZGVjbGluZVN1YnNjcmlwdGlvbnMgKTtcblx0XHRcdHZhciAkZGVjbGluZSA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApO1xuXG5cdFx0XHRpZiAoICQoIGV2ZW50LnRhcmdldCApLmlzKCB0aGlzLm9wdGlvbnMuZGVjbGluZVN1YnNjcmlwdGlvbnMgKSApIHtcblx0XHRcdFx0JHN1YnNjcmlwdGlvbnMucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRkZWNsaW5lLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHR9LCAvLyBlbmQgb25TdWJzY3JpcHRpb25zQ2hhbmdlXG5cblx0XHRjbGVhckFtb3VudFNlbGVjdG9yOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgJHN1Z2dlc3RlZEFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApO1xuXG5cdFx0XHRpZiAoICQoIGV2ZW50LnRhcmdldCApLnZhbCgpID09PSAnJyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQkc3VnZ2VzdGVkQW1vdW50LnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHR9LCAvLyBlbmQgY2xlYXJBbW91bnRTZWxlY3RvclxuXG5cdFx0c2V0QW1vdW50TGFiZWxzOiBmdW5jdGlvbiggZnJlcXVlbmN5U3RyaW5nICkge1xuXHRcdFx0dmFyICRncm91cHMgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50R3JvdXAgKTtcblx0XHRcdHZhciAkc2VsZWN0ZWQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKVxuXHRcdFx0ICAgIC5maWx0ZXIoICc6Y2hlY2tlZCcgKTtcblx0XHRcdHZhciBpbmRleCA9ICRzZWxlY3RlZC5kYXRhKCAnaW5kZXgnICk7XG5cdFx0XHR2YXIgJGN1c3RvbUFtb3VudEZyZXF1ZW5jeSA9ICQoIHRoaXMub3B0aW9ucy5jdXN0b21BbW91bnRGcmVxdWVuY3kgKTtcblxuXHRcdFx0JGdyb3Vwcy5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCRncm91cHMuZmlsdGVyKCAnW2RhdGEtZnJlcXVlbmN5PVwiJyArIGZyZXF1ZW5jeVN0cmluZyArICdcIl0nIClcblx0XHRcdFx0LmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0JHNlbGVjdGVkLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHRcdCRncm91cHMuZmlsdGVyKCAnLmFjdGl2ZScgKVxuXHRcdFx0XHQuZmluZCggJ2lucHV0W3R5cGU9XCJyYWRpb1wiXVtkYXRhLWluZGV4PVwiJyArIGluZGV4ICsgJ1wiXScgKVxuXHRcdFx0XHQucHJvcCggJ2NoZWNrZWQnLCB0cnVlICk7XG5cblx0XHRcdHZhciBjdXJyZW50RnJlcXVlbmN5TGFiZWwgPSAkZ3JvdXBzLmZpbHRlciggJy5hY3RpdmUnICkuZmluZCgnLmEtZnJlcXVlbmN5LXRleHQtbGFiZWwnKS5maXJzdCgpLnRleHQoKTtcblx0XHRcdCRjdXN0b21BbW91bnRGcmVxdWVuY3kudGV4dCggY3VycmVudEZyZXF1ZW5jeUxhYmVsICk7XG5cdFx0fSwgLy8gZW5kIHNldEFtb3VudExhYmVsc1xuXG5cdFx0c2V0TWluQW1vdW50czogZnVuY3Rpb24oIGZyZXF1ZW5jeVN0cmluZyApIHtcblx0XHRcdHZhciAkZWxlbWVudHMgPSAkKCB0aGlzLm9wdGlvbnMubWluQW1vdW50cyApO1xuXHRcdFx0JGVsZW1lbnRzLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0JGVsZW1lbnRzLmZpbHRlciggJ1tkYXRhLWZyZXF1ZW5jeT1cIicgKyBmcmVxdWVuY3lTdHJpbmcgKyAnXCJdJyApXG5cdFx0XHRcdC5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHR9LCAvLyBlbmQgc2V0TWluQW1vdW50c1xuXG5cdFx0Y2hlY2tBbmRTZXRMZXZlbDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgYW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yICkuZmlsdGVyKCAnOmNoZWNrZWQnICkudmFsKCk7XG5cdFx0XHRpZiAoIHR5cGVvZiBhbW91bnQgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRhbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQgKS52YWwoKTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnICkudmFsKCk7XG5cdFx0XHR2YXIgZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdHZhciBmcmVxdWVuY3lfaWQgPSAkKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnICkucHJvcCggJ2lkJyApO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9sYWJlbCA9ICQoICdsYWJlbFtmb3I9XCInICsgZnJlcXVlbmN5X2lkICsgJ1wiXScgKS50ZXh0KCk7XG5cblx0XHRcdHZhciBsZXZlbCA9IE1pbm5Qb3N0TWVtYmVyc2hpcC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUgKTtcblx0XHRcdHRoaXMuc2hvd05ld0xldmVsKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdHRoaXMuc2V0RW5hYmxlZEdpZnRzKCBsZXZlbCApO1xuXHRcdFx0dGhpcy5hbmFseXRpY3NUcmFja2VyKCBsZXZlbFsnbmFtZSddLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCApO1xuXHRcdH0sIC8vIGVuZCBjaGVja0FuZFNldExldmVsXG5cblx0XHRzaG93TmV3TGV2ZWw6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApIHtcblx0XHRcdHZhciBtZW1iZXJfbGV2ZWxfcHJlZml4ID0gJyc7XG5cdFx0XHR2YXIgb2xkX2xldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxWaWV3ZXJDb250YWluZXIgPSBvcHRpb25zLmxldmVsVmlld2VyOyAvLyB0aGlzIHNob3VsZCBjaGFuZ2Ugd2hlbiB3ZSByZXBsYWNlIHRoZSB0ZXh0LCBpZiB0aGVyZSBpcyBhIGxpbmsgaW5zaWRlIGl0XG5cdFx0XHR2YXIgZGVjb2RlSHRtbEVudGl0eSA9IGZ1bmN0aW9uKCBzdHIgKSB7XG5cdFx0XHRcdHJldHVybiBzdHIucmVwbGFjZSggLyYjKFxcZCspOy9nLCBmdW5jdGlvbiggbWF0Y2gsIGRlYyApIHtcblx0XHRcdFx0XHRyZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSggZGVjICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdG1lbWJlcl9sZXZlbF9wcmVmaXggPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEubWVtYmVyX2xldmVsX3ByZWZpeDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmxldmVsVmlld2VyICkubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxWaWV3ZXIpLnByb3AoICdjbGFzcycsICdhLXNob3ctbGV2ZWwgYS1zaG93LWxldmVsLScgKyBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKTtcblxuXHRcdFx0XHRpZiAoICQoIG9wdGlvbnMudXNlckN1cnJlbnRMZXZlbCApLmxlbmd0aCA+IDAgJiYgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHRcdGlmICggJ2EnLCAkKCBvcHRpb25zLmxldmVsVmlld2VyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdGxldmVsVmlld2VyQ29udGFpbmVyID0gb3B0aW9ucy5sZXZlbFZpZXdlciArICcgYSc7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0b2xkX2xldmVsID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwucmVwbGFjZSggbWVtYmVyX2xldmVsX3ByZWZpeCwgJycgKTtcblxuXHRcdFx0XHRcdGlmICggb2xkX2xldmVsICE9PSBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKSB7XG5cdFx0XHRcdFx0XHQkKCBsZXZlbFZpZXdlckNvbnRhaW5lciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5kYXRhKCAnY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoIGxldmVsVmlld2VyQ29udGFpbmVyICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmRhdGEoICdub3QtY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0JChvcHRpb25zLmxldmVsTmFtZSwgb3B0aW9ucy5sZXZlbFZpZXdlcikudGV4dCggbGV2ZWxbJ25hbWUnXSApO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBzaG93TmV3TGV2ZWxcblxuXHRcdHNldEVuYWJsZWRHaWZ0czogZnVuY3Rpb24oIGxldmVsICkge1xuXHRcdFx0dmFyIHNldEVuYWJsZWQgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0JCggdGhpcyApLnByb3AoICdkaXNhYmxlZCcsIGxldmVsLnllYXJseUFtb3VudCA8ICQoIHRoaXMgKS5kYXRhKCAnbWluWWVhcmx5QW1vdW50JyApICk7XG5cdFx0XHR9O1xuXG5cdFx0XHQkKCB0aGlzLm9wdGlvbnMuc3dhZ1NlbGVjdG9yICkuZWFjaCggc2V0RW5hYmxlZCApO1xuXHRcdFx0JCggdGhpcy5vcHRpb25zLnN1YnNjcmlwdGlvbnNTZWxlY3RvciApLmVhY2goIHNldEVuYWJsZWQgKTtcblxuXHRcdFx0aWYgKCAkKCB0aGlzLm9wdGlvbnMuc3dhZ1NlbGVjdG9yICkubm90KCAnI3N3YWctZGVjbGluZScgKS5pcyggJzplbmFibGVkJyApICkge1xuXHRcdFx0XHQkKCAnLnN3YWctZGlzYWJsZWQnICkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoICcuc3dhZy1lbmFibGVkJyApLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JCggJy5zd2FnLWRpc2FibGVkJyApLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHQkKCAnLnN3YWctZW5hYmxlZCcgKS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgc2V0RW5hYmxlZEdpZnRzXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCApO1xuIiwiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBiZW5lZml0Rm9ybSgpIHtcblx0XHRpZiAoIDIgPT09IHBlcmZvcm1hbmNlLm5hdmlnYXRpb24udHlwZSApIHtcblx0XHRcdGxvY2F0aW9uLnJlbG9hZCggdHJ1ZSApO1xuXHRcdH1cblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24uYS1idXR0b24tZGlzYWJsZWQnICkucmVtb3ZlQXR0ciggJ2Rpc2FibGVkJyApO1xuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHZhciAkYnV0dG9uICA9ICQoIHRoaXMgKTtcblx0XHRcdHZhciAkc3RhdHVzICA9ICQoICcubS1iZW5lZml0LW1lc3NhZ2UnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciAkc2VsZWN0ICA9ICQoICdzZWxlY3QnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciBzZXR0aW5ncyA9IG1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3M7XG5cdFx0XHQvLyByZXNldCB0aGUgbWVzc2FnZSBmb3IgY3VycmVudCBzdGF0dXNcblx0XHRcdGlmICggISAnLm0tYmVuZWZpdC1tZXNzYWdlLXN1Y2Nlc3MnICkge1xuXHRcdFx0XHQkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJyApLnJlbW92ZUNsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSBtLWJlbmVmaXQtbWVzc2FnZS1lcnJvciBtLWJlbmVmaXQtbWVzc2FnZS1pbmZvJyApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gc2V0IGJ1dHRvbiB0byBwcm9jZXNzaW5nXG5cdFx0XHQkYnV0dG9uLnRleHQoICdQcm9jZXNzaW5nJyApLmFkZENsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cblx0XHRcdC8vIGRpc2FibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gc2V0IGFqYXggZGF0YVxuXHRcdFx0dmFyIGRhdGEgPSB7fTtcblx0XHRcdHZhciBiZW5lZml0VHlwZSA9ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJyApLnZhbCgpO1xuXHRcdFx0aWYgKCAncGFydG5lci1vZmZlcnMnID09PSBiZW5lZml0VHlwZSApIHtcblx0XHRcdFx0ZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdiZW5lZml0X2Zvcm1fc3VibWl0Jyxcblx0XHRcdFx0XHQnbWlubnBvc3RfbWVtYmVyc2hpcF9iZW5lZml0X2Zvcm1fbm9uY2UnIDogJGJ1dHRvbi5kYXRhKCAnYmVuZWZpdC1ub25jZScgKSxcblx0XHRcdFx0XHQnY3VycmVudF91cmwnIDogJCggJ2lucHV0W25hbWU9XCJjdXJyZW50X3VybFwiXScpLnZhbCgpLFxuXHRcdFx0XHRcdCdiZW5lZml0LW5hbWUnOiAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScpLnZhbCgpLFxuXHRcdFx0XHRcdCdpbnN0YW5jZV9pZCcgOiAkKCAnW25hbWU9XCJpbnN0YW5jZS1pZC0nICsgJGJ1dHRvbi52YWwoKSArICdcIl0nICkudmFsKCksXG5cdFx0XHRcdFx0J3Bvc3RfaWQnIDogJGJ1dHRvbi52YWwoKSxcblx0XHRcdFx0XHQnaXNfYWpheCcgOiAnMScsXG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JC5wb3N0KCBzZXR0aW5ncy5hamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdFx0Ly8gc3VjY2Vzc1xuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdCRzdGF0dXMuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuYWRkQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3MgKTtcblx0XHRcdFx0XHRcdGlmICggMCA8ICRzZWxlY3QubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0XHQkc2VsZWN0LnByb3AoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkuYXR0ciggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBlcnJvclxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnID09PSB0eXBlb2YgcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdCQoICdvcHRpb24nLCAkc2VsZWN0ICkuZWFjaCggZnVuY3Rpb24oIGkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCAkKCB0aGlzICkudmFsKCkgPT09IHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0JCggdGhpcyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIHJlLWVuYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdFx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXHRcdFx0XHRcdFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXHRcdGlmICggMCA8ICQoICcubS1mb3JtLW1lbWJlcnNoaXAtYmVuZWZpdCcgKS5sZW5ndGggKSB7XG5cdFx0XHRiZW5lZml0Rm9ybSgpO1xuXHRcdH1cblx0fSk7XG5cblx0JCggJy5hLXJlZnJlc2gtcGFnZScgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0bG9jYXRpb24ucmVsb2FkKCk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiKCBmdW5jdGlvbiggJCApIHtcblx0ZnVuY3Rpb24gbXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQoIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApIHtcblx0XHRpZiAoIHR5cGVvZiBnYSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkgeyBcblx0XHQkKCAnLm0tc3VwcG9ydC1jdGEtdG9wIC5hLXN1cHBvcnQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgdmFsdWUgPSAnJztcblx0XHRcdGlmICggJCggJ3N2ZycsICQoIHRoaXMgKSApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdHZhbHVlID0gJCggJ3N2ZycsICQoIHRoaXMgKSApLmF0dHIoICd0aXRsZScgKSArICcgJztcblx0XHRcdH1cblx0XHRcdHZhbHVlID0gdmFsdWUgKyAkKCB0aGlzICkudGV4dCgpO1xuXHRcdFx0bXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQoICdldmVudCcsICdTdXBwb3J0IENUQSAtIEhlYWRlcicsICdDbGljazogJyArIHZhbHVlLCBsb2NhdGlvbi5wYXRobmFtZSApO1xuXHRcdH0pO1xuXHR9KTtcblxufSApKCBqUXVlcnkgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCwgdW5kZWZpbmVkICkge1xuXG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHQnZGVidWcnIDogZmFsc2UsIC8vIHRoaXMgY2FuIGJlIHNldCB0byB0cnVlIG9uIHBhZ2UgbGV2ZWwgb3B0aW9uc1xuXHRcdCdhbW91bnRfdmlld2VyJyA6ICcuYW1vdW50IGgzJyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmEtZm9ybS1pdGVtLW1lbWJlcnNoaXAtZnJlcXVlbmN5Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsc190eXBlJyA6ICdzZWxlY3QnLFxuXHRcdCdsZXZlbHNfY29udGFpbmVyJyA6ICcuby1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbHMnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfY29udGFpbmVyJyA6ICcubS1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbCcsXG5cdFx0J3NpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yJyA6ICcubS1tZW1iZXItbGV2ZWwtYnJpZWYnLFxuXHRcdCdmbGlwcGVkX2l0ZW1zJyA6ICdkaXYuYW1vdW50LCBkaXYuZW50ZXInLFxuXHRcdCdsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvcicgOiAnLnNob3ctZnJlcXVlbmN5Jyxcblx0XHQnY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hbW91bnQgLmEtYnV0dG9uLWZsaXAnLFxuXHRcdCdhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuZW50ZXIgaW5wdXQuYW1vdW50LWVudHJ5Jyxcblx0fTsgLy8gZW5kIGRlZmF1bHRzXG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXG5cdFx0aW5pdDogZnVuY3Rpb24oIHJlc2V0LCBhbW91bnQgKSB7XG5cdFx0XHQvLyBQbGFjZSBpbml0aWFsaXphdGlvbiBsb2dpYyBoZXJlXG5cdFx0XHQvLyBZb3UgYWxyZWFkeSBoYXZlIGFjY2VzcyB0byB0aGUgRE9NIGVsZW1lbnQgYW5kXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyB2aWEgdGhlIGluc3RhbmNlLCBlLmcuIHRoaXMuZWxlbWVudFxuXHRcdFx0Ly8gYW5kIHRoaXMub3B0aW9uc1xuXHRcdFx0Ly8geW91IGNhbiBhZGQgbW9yZSBmdW5jdGlvbnMgbGlrZSB0aGUgb25lIGJlbG93IGFuZFxuXHRcdFx0Ly8gY2FsbCB0aGVtIGxpa2Ugc286IHRoaXMueW91ck90aGVyRnVuY3Rpb24odGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpLlxuXHRcdFx0dGhpcy5jYXRjaEhhc2hMaW5rcyggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5sZXZlbEZsaXBwZXIoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN0YXJ0TGV2ZWxDbGljayggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHR9LFxuXG5cdFx0Y2F0Y2hIYXNoTGlua3M6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnYVtocmVmKj1cIiNcIl06bm90KFtocmVmPVwiI1wiXSknLCBlbGVtZW50KS5jbGljayhmdW5jdGlvbihlKSB7XG5cdFx0XHRcdHZhciB0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblx0XHRcdFx0aWYgKHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiYgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpID09IHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpICYmIGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWUpIHtcblx0XHRcdFx0XHR2YXIgdGFyZ2V0ID0gJCh0aGlzLmhhc2gpO1xuXHRcdFx0XHRcdHRhcmdldCA9IHRhcmdldC5sZW5ndGggPyB0YXJnZXQgOiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsnXScpO1xuXHRcdFx0XHRcdGlmICh0YXJnZXQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQkKCdodG1sLGJvZHknKS5hbmltYXRlKHtcblx0XHRcdFx0XHRcdFx0c2Nyb2xsVG9wOiB0YXJnZXQub2Zmc2V0KCkudG9wXG5cdFx0XHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbEZsaXBwZXI6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIGFtb3VudCA9IDA7XG5cdFx0XHR2YXIgbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSAwO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3kgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9ICcnO1xuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxzX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQgKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuZmxpcHBlZF9pdGVtcywgJCh0aGlzKSApLndyYXBBbGwoICc8ZGl2IGNsYXNzPVwiZmxpcHBlclwiLz4nICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCh0aGlzKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0XHRpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBmcmVxdWVuY3kgPT0gMSApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQteWVhcmx5JyApICk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3kgPT0gMTIgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LW1vbnRobHknICkgKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXG5cdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHR0aGF0LmNoYW5nZUZyZXF1ZW5jeSggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJCggb3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IsIGVsZW1lbnQpLnRleHQoZnJlcXVlbmN5X25hbWUpO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkudmFsKCk7XG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGF0LmNoYW5nZUFtb3VudFByZXZpZXcoIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKS5wYXJlbnQoKSApLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGxldmVsRmxpcHBlclxuXG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlICk7XG5cblx0XHRcdCQoJ2gyJywgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWxbJ25hbWUnXSApIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQodGhpcykucGFyZW50KCkucGFyZW50KCkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRjaGFuZ2VGcmVxdWVuY3k6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdFx0dmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0XHR2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdHZhciBmcmVxdWVuY3kgICAgICA9IHBhcnNlSW50KCBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMV0gKTtcblxuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS52YWwoIHNlbGVjdGVkICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnByb3AoICdzZWxlY3RlZCcsIHNlbGVjdGVkICk7XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkuZGF0YSggJ2ZyZXF1ZW5jeScsIGZyZXF1ZW5jeSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUZyZXF1ZW5jeVxuXG5cdFx0Y2hhbmdlQW1vdW50UHJldmlldzogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0XHR2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHRcdHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUFtb3VudFByZXZpZXdcblxuXHRcdHN0YXJ0TGV2ZWxDbGljazogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCcuc3RhcnQtbGV2ZWwnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGxldmVsX2NsYXNzID0gJCggdGhpcyApLnByb3AoICdjbGFzcycgKTtcblx0XHRcdFx0dmFyIGxldmVsX251bWJlciA9IGxldmVsX2NsYXNzW2xldmVsX2NsYXNzLmxlbmd0aCAtMV07XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyLCBlbGVtZW50ICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciArICcgJyArIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwICk7XG4iLCIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50ICkge1xuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RUcmFja1N1Ym1pdCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdHR5cGU6ICdldmVudCcsXG5cdFx0Y2F0ZWdvcnk6ICdTdXBwb3J0IFVzJyxcblx0XHRhY3Rpb246ICdCZWNvbWUgQSBNZW1iZXInLFxuXHRcdGxhYmVsOiBsb2NhdGlvbi5wYXRobmFtZVxuXHR9O1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG5cblx0XHRcdCQoIHRoaXMuZWxlbWVudCApLnN1Ym1pdCggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHQvLyB0aGlzIHRyYWNrcyBhbiBldmVudCBzdWJtaXNzaW9uIGJhc2VkIG9uIHRoZSBwbHVnaW4gb3B0aW9uc1xuXHRcdFx0XHQvLyBpdCBhbHNvIGJ1YmJsZXMgdGhlIGV2ZW50IHVwIHRvIHN1Ym1pdCB0aGUgZm9ybVxuXHRcdFx0XHR0aGF0LmFuYWx5dGljc0V2ZW50VHJhY2soXG5cdFx0XHRcdFx0b3B0aW9ucy50eXBlLFxuXHRcdFx0XHRcdG9wdGlvbnMuY2F0ZWdvcnksXG5cdFx0XHRcdFx0b3B0aW9ucy5hY3Rpb24sXG5cdFx0XHRcdFx0b3B0aW9ucy5sYWJlbFxuXHRcdFx0XHQpO1xuXHRcdFx0XHQvLyBpZiB0aGlzIGlzIHRoZSBtYWluIGNoZWNrb3V0IGZvcm0sIHNlbmQgaXQgdG8gdGhlIGVjIHBsdWdpbiBhcyBhIGNoZWNrb3V0XG5cdFx0XHRcdHRoYXQuYW5hbHl0aWNzRWNvbW1lcmNlVHJhY2soICQoIHRoYXQuZWxlbWVudCApICk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0YW5hbHl0aWNzRXZlbnRUcmFjazogZnVuY3Rpb24oIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApIHtcblx0XHRcdGlmICggdHlwZW9mIGdhID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICk7XG5cdFx0fSwgLy8gZW5kIGFuYWx5dGljc0V2ZW50VHJhY2tcblxuXHRcdGFuYWx5dGljc0Vjb21tZXJjZVRyYWNrOiBmdW5jdGlvbiggZWxlbWVudCApIHtcblx0XHRcdGlmICggdHlwZW9mIGdhID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Z2EoICdyZXF1aXJlJywgJ2VjJyApO1xuXHRcdFx0aWYgKCBlbGVtZW50Lmhhc0NsYXNzKCAnbS1mb3JtLW1lbWJlcnNoaXAtc3VwcG9ydCcgKSApIHtcblx0XHRcdFx0Z2EoICdlYzpzZXRBY3Rpb24nLCAnY2hlY2tvdXQnLCB7XG5cdFx0XHRcdFx0J3N0ZXAnOiAxLFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzRWNvbW1lcmNlVHJhY2tcblxuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50ICk7XG4iXX0=
