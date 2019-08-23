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
      $groups.removeClass('active');
      $groups.filter('[data-frequency="' + frequencyString + '"]').addClass('active');
      $selected.prop('checked', false);
      $groups.filter('.active').find('input[type="radio"][data-index="' + index + '"]').prop('checked', true);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIiwidHJhY2stc3VibWl0LmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsIm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCIkIiwiZG9jdW1lbnQiLCJwbHVnaW5OYW1lIiwiZGVmYXVsdHMiLCJmcmVxdWVuY3lTZWxlY3RvciIsImFtb3VudEdyb3VwIiwiYW1vdW50U2VsZWN0b3IiLCJhbW91bnRMYWJlbHMiLCJhbW91bnRWYWx1ZSIsImFtb3VudERlc2NyaXB0aW9uIiwiYW1vdW50RmllbGQiLCJsZXZlbFZpZXdlciIsImxldmVsTmFtZSIsInVzZXJDdXJyZW50TGV2ZWwiLCJkZWNsaW5lQmVuZWZpdHMiLCJnaWZ0U2VsZWN0aW9uR3JvdXAiLCJzd2FnRWxpZ2liaWxpdHlUZXh0Iiwic3dhZ1NlbGVjdG9yIiwic3dhZ0xhYmVscyIsInN1YnNjcmlwdGlvbnNTZWxlY3RvciIsInN1YnNjcmlwdGlvbnNMYWJlbHMiLCJtaW5BbW91bnRzIiwiZGVjbGluZVN1YnNjcmlwdGlvbnMiLCJQbHVnaW4iLCJlbGVtZW50Iiwib3B0aW9ucyIsImV4dGVuZCIsIl9kZWZhdWx0cyIsIl9uYW1lIiwiaW5pdCIsIiRmcmVxdWVuY3kiLCJmaW5kIiwiJHN1Z2dlc3RlZEFtb3VudCIsIiRhbW91bnQiLCIkZGVjbGluZUJlbmVmaXRzIiwiJHN1YnNjcmlwdGlvbnMiLCJsZW5ndGgiLCJnYSIsInNldEFtb3VudExhYmVscyIsImZpbHRlciIsInZhbCIsInNldE1pbkFtb3VudHMiLCJjaGVja0FuZFNldExldmVsIiwib24iLCJvbkZyZXF1ZW5jeUNoYW5nZSIsImJpbmQiLCJvblN1Z2dlc3RlZEFtb3VudENoYW5nZSIsIm9uQW1vdW50Q2hhbmdlIiwibm90IiwiaXMiLCJwcm9wIiwib25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UiLCJvblN1YnNjcmlwdGlvbnNDbGljayIsImFuYWx5dGljc1RyYWNrZXIiLCJmcmVxdWVuY3lfbGFiZWwiLCJ0b0xvd2VyQ2FzZSIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJldmVudCIsInRhcmdldCIsImNsZWFyQW1vdW50U2VsZWN0b3IiLCIkdGFyZ2V0IiwiJGdpZnRTZWxlY3Rpb25Hcm91cCIsImRlY2xpbmUiLCJoaWRlIiwic2hvdyIsIiRkZWNsaW5lIiwiZnJlcXVlbmN5U3RyaW5nIiwiJGdyb3VwcyIsIiRzZWxlY3RlZCIsImluZGV4IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsIiRlbGVtZW50cyIsImZyZXF1ZW5jeV9zdHJpbmciLCJzcGxpdCIsImZyZXF1ZW5jeV9uYW1lIiwiZnJlcXVlbmN5X2lkIiwidGV4dCIsInNob3dOZXdMZXZlbCIsInNldEVuYWJsZWRHaWZ0cyIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbFZpZXdlckNvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJyZXBsYWNlIiwibWF0Y2giLCJkZWMiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJtZW1iZXJfbGV2ZWwiLCJodG1sIiwic2V0RW5hYmxlZCIsInllYXJseUFtb3VudCIsImVhY2giLCJmbiIsImpRdWVyeSIsImJlbmVmaXRGb3JtIiwicGVyZm9ybWFuY2UiLCJuYXZpZ2F0aW9uIiwibG9jYXRpb24iLCJyZWxvYWQiLCJyZW1vdmVBdHRyIiwiY2xpY2siLCJwcmV2ZW50RGVmYXVsdCIsIiRidXR0b24iLCIkc3RhdHVzIiwicGFyZW50IiwiJHNlbGVjdCIsImJlbmVmaXRUeXBlIiwicG9zdCIsImFqYXh1cmwiLCJyZXNwb25zZSIsInN1Y2Nlc3MiLCJidXR0b25fdmFsdWUiLCJidXR0b25fbGFiZWwiLCJidXR0b25fY2xhc3MiLCJidXR0b25fYXR0ciIsIm1lc3NhZ2UiLCJtZXNzYWdlX2NsYXNzIiwiYXR0ciIsInJlbW92ZV9pbnN0YW5jZV92YWx1ZSIsImkiLCJyZW1vdmUiLCJyZWFkeSIsIm1wX21lbWJlcnNoaXBfYW5hbHl0aWNzX3RyYWNraW5nX2V2ZW50IiwiY2F0ZWdvcnkiLCJhY3Rpb24iLCJsYWJlbCIsInZhbHVlIiwicGF0aG5hbWUiLCJ1bmRlZmluZWQiLCJyZXNldCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwiZSIsImhvc3RuYW1lIiwiaGFzaCIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwibGV2ZWxfbnVtYmVyIiwibGV2ZWxzX2NvbnRhaW5lciIsInNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yIiwiZmxpcHBlZF9pdGVtcyIsIndyYXBBbGwiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsImNsb3Nlc3QiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwiY2hhbmdlQW1vdW50UHJldmlldyIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyIsInN1Ym1pdCIsImFuYWx5dGljc0V2ZW50VHJhY2siLCJhbmFseXRpY3NFY29tbWVyY2VUcmFjayIsImhhc0NsYXNzIl0sIm1hcHBpbmdzIjoiOztBQUFBOztBQUFDLENBQUMsVUFBV0EsTUFBWCxFQUFvQjtBQUNyQixXQUFTQyxrQkFBVCxDQUE2QkMsSUFBN0IsRUFBbUNDLFFBQW5DLEVBQThDO0FBQzdDLFNBQUtELElBQUwsR0FBWSxFQUFaOztBQUNBLFFBQUksT0FBT0EsSUFBUCxLQUFnQixXQUFwQixFQUFpQztBQUNoQyxXQUFLQSxJQUFMLEdBQVlBLElBQVo7QUFDQTs7QUFFRCxTQUFLQyxRQUFMLEdBQWdCLEVBQWhCOztBQUNBLFFBQUksT0FBT0EsUUFBUCxLQUFvQixXQUF4QixFQUFxQztBQUNwQyxXQUFLQSxRQUFMLEdBQWdCQSxRQUFoQjtBQUNBOztBQUVELFNBQUtDLGNBQUwsR0FBc0IsRUFBdEI7O0FBQ0EsUUFBSyxPQUFPLEtBQUtGLElBQUwsQ0FBVUcsWUFBakIsS0FBa0MsV0FBbEMsSUFDQSxPQUFPLEtBQUtILElBQUwsQ0FBVUcsWUFBVixDQUF1QkMsZUFBOUIsS0FBa0QsV0FEdkQsRUFDcUU7QUFDcEUsV0FBS0YsY0FBTCxHQUFzQixLQUFLRixJQUFMLENBQVVHLFlBQVYsQ0FBdUJDLGVBQTdDO0FBQ0E7QUFDRDs7QUFFREwsRUFBQUEsa0JBQWtCLENBQUNNLFNBQW5CLEdBQStCO0FBQzlCQyxJQUFBQSxVQUFVLEVBQUUsb0JBQVVDLE1BQVYsRUFBa0JDLFNBQWxCLEVBQTZCQyxJQUE3QixFQUFvQztBQUMvQyxVQUFJQyxRQUFRLEdBQUdDLFFBQVEsQ0FBRUosTUFBRixDQUFSLEdBQXFCSSxRQUFRLENBQUVILFNBQUYsQ0FBNUM7O0FBQ0EsVUFBSyxPQUFPLEtBQUtOLGNBQVosS0FBK0IsV0FBL0IsSUFBOEMsS0FBS0EsY0FBTCxLQUF3QixFQUEzRSxF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QjhJLFFBQWhCLEVBQTBCQyxNQUExQixFQUFrQ0MsS0FBbEMsRUFBeUNDLEtBQXpDLENBQUY7QUFDQSxLQTlCaUI7QUE4QmY7QUFFSHFDLElBQUFBLHVCQUF1QixFQUFFLGlDQUFVaEosT0FBVixFQUFvQjtBQUM1QyxVQUFLLE9BQU9hLEVBQVAsS0FBYyxXQUFuQixFQUFpQztBQUNoQztBQUNBOztBQUNEQSxNQUFBQSxFQUFFLENBQUUsU0FBRixFQUFhLElBQWIsQ0FBRjs7QUFDQSxVQUFLYixPQUFPLENBQUNpSixRQUFSLENBQWtCLDJCQUFsQixDQUFMLEVBQXVEO0FBQ3REcEksUUFBQUEsRUFBRSxDQUFFLGNBQUYsRUFBa0IsVUFBbEIsRUFBOEI7QUFDL0Isa0JBQVE7QUFEdUIsU0FBOUIsQ0FBRjtBQUdBO0FBQ0QsS0ExQ2lCLENBMENmOztBQTFDZSxHQUFuQixDQTFCa0MsQ0FzRS9CO0FBR0g7QUFDQTs7QUFDQXJDLEVBQUFBLENBQUMsQ0FBQ2lHLEVBQUYsQ0FBSy9GLFVBQUwsSUFBbUIsVUFBV3VCLE9BQVgsRUFBcUI7QUFDdkMsV0FBTyxLQUFLdUUsSUFBTCxDQUFVLFlBQVk7QUFDNUIsVUFBSyxDQUFFaEcsQ0FBQyxDQUFDdkIsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZeUIsVUFBMUIsQ0FBUCxFQUFnRDtBQUMvQ0YsUUFBQUEsQ0FBQyxDQUFDdkIsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZeUIsVUFBMUIsRUFBc0MsSUFBSXFCLE1BQUosQ0FBWSxJQUFaLEVBQWtCRSxPQUFsQixDQUF0QztBQUNBO0FBQ0QsS0FKTSxDQUFQO0FBS0EsR0FORDtBQU9BLENBbEZBLEVBa0ZHeUUsTUFsRkgsRUFrRlczSCxNQWxGWCxFQWtGbUIwQixRQWxGbkIiLCJmaWxlIjoibWlubnBvc3QtbWVtYmVyc2hpcC1mcm9udC1lbmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyI7KGZ1bmN0aW9uICggd2luZG93ICkge1xuXHRmdW5jdGlvbiBNaW5uUG9zdE1lbWJlcnNoaXAoIGRhdGEsIHNldHRpbmdzICkge1xuXHRcdHRoaXMuZGF0YSA9IHt9O1xuXHRcdGlmICh0eXBlb2YgZGF0YSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRoaXMuZGF0YSA9IGRhdGE7XG5cdFx0fVxuXG5cdFx0dGhpcy5zZXR0aW5ncyA9IHt9O1xuXHRcdGlmICh0eXBlb2Ygc2V0dGluZ3MgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG5cdFx0fVxuXG5cdFx0dGhpcy5wcmV2aW91c0Ftb3VudCA9ICcnO1xuXHRcdGlmICggdHlwZW9mIHRoaXMuZGF0YS5jdXJyZW50X3VzZXIgIT09ICd1bmRlZmluZWQnICYmXG5cdFx0ICAgICB0eXBlb2YgdGhpcy5kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0dGhpcy5wcmV2aW91c0Ftb3VudCA9IHRoaXMuZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50O1xuXHRcdH1cblx0fVxuXG5cdE1pbm5Qb3N0TWVtYmVyc2hpcC5wcm90b3R5cGUgPSB7XG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlICkge1xuXHRcdFx0dmFyIHRoaXN5ZWFyID0gcGFyc2VJbnQoIGFtb3VudCApICogcGFyc2VJbnQoIGZyZXF1ZW5jeSApO1xuXHRcdFx0aWYgKCB0eXBlb2YgdGhpcy5wcmV2aW91c0Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5wcmV2aW91c0Ftb3VudCAhPT0gJycgKSB7XG5cdFx0XHRcdHZhciBwcmlvcl95ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCB0aGlzLnByZXZpb3VzQW1vdW50LnByaW9yX3llYXJfY29udHJpYnV0aW9ucywgMTAgKTtcblx0XHRcdFx0dmFyIGNvbWluZ195ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCB0aGlzLnByZXZpb3VzQW1vdW50LmNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMsIDEwICk7XG5cdFx0XHRcdHZhciBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCA9IHBhcnNlSW50KCB0aGlzLnByZXZpb3VzQW1vdW50LmFubnVhbF9yZWN1cnJpbmdfYW1vdW50LCAxMCApO1xuXHRcdFx0XHQvLyBjYWxjdWxhdGUgbWVtYmVyIGxldmVsIGZvcm11bGFcblx0XHRcdFx0aWYgKCB0eXBlID09PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHByaW9yX3llYXJfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGhpc3llYXIgPSBNYXRoLm1heCggcHJpb3JfeWVhcl9hbW91bnQsIGNvbWluZ195ZWFyX2Ftb3VudCwgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0TGV2ZWwoIHRoaXN5ZWFyICk7XG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGdldExldmVsOiBmdW5jdGlvbiggdGhpc3llYXIgKSB7XG5cdFx0XHR2YXIgbGV2ZWwgPSB7XG5cdFx0XHRcdCd5ZWFybHlBbW91bnQnOiB0aGlzeWVhclxuXHRcdFx0fTtcblx0XHRcdGlmICggdGhpc3llYXIgPiAwICYmIHRoaXN5ZWFyIDwgNjAgKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnQnJvbnplJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHRoaXN5ZWFyID4gNTkgJiYgdGhpc3llYXIgPCAxMjApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdTaWx2ZXInO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAyO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDExOSAmJiB0aGlzeWVhciA8IDI0MCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0dvbGQnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAzO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDIzOSkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1BsYXRpbnVtJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gNDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgZ2V0TGV2ZWxcblx0fTtcblxuXHR3aW5kb3cuTWlublBvc3RNZW1iZXJzaGlwID0gbmV3IE1pbm5Qb3N0TWVtYmVyc2hpcChcblx0XHR3aW5kb3cubWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLFxuXHRcdHdpbmRvdy5taW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzXG5cdCk7XG59KSggd2luZG93ICk7XG4iLCIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXAgKSB7XG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdEFtb3VudFNlbGVjdCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdGZyZXF1ZW5jeVNlbGVjdG9yOiAnLm0tZnJlcXVlbmN5LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGFtb3VudEdyb3VwOiAnLm0tZnJlcXVlbmN5LWdyb3VwJyxcblx0XHRhbW91bnRTZWxlY3RvcjogJy5tLWFtb3VudC1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRhbW91bnRMYWJlbHM6ICcubS1hbW91bnQtc2VsZWN0IGxhYmVsJyxcblx0XHRhbW91bnRWYWx1ZTogJ3N0cm9uZycsXG5cdFx0YW1vdW50RGVzY3JpcHRpb246ICcuYS1hbW91bnQtZGVzY3JpcHRpb24nLFxuXHRcdGFtb3VudEZpZWxkOiAnLmEtYW1vdW50LWZpZWxkICNhbW91bnQnLFxuXHRcdGxldmVsVmlld2VyOiAnLmEtc2hvdy1sZXZlbCcsXG5cdFx0bGV2ZWxOYW1lOiAnLmEtbGV2ZWwnLFxuXHRcdHVzZXJDdXJyZW50TGV2ZWw6ICcuYS1jdXJyZW50LWxldmVsJyxcblx0XHRkZWNsaW5lQmVuZWZpdHM6ICcubS1kZWNsaW5lLWJlbmVmaXRzLXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGdpZnRTZWxlY3Rpb25Hcm91cDogJy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvcicsXG5cdFx0c3dhZ0VsaWdpYmlsaXR5VGV4dDogJy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvciAuc3dhZy1lbGlnaWJpbGl0eScsXG5cdFx0c3dhZ1NlbGVjdG9yOiAnLm0tc2VsZWN0LXN3YWcgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRzd2FnTGFiZWxzOiAnLm0tc2VsZWN0LXN3YWcgaW5wdXRbdHlwZT1cInJhZGlvXCJdICsgbGFiZWwnLFxuXHRcdHN1YnNjcmlwdGlvbnNTZWxlY3RvcjogJy5tLXNlbGVjdC1zdWJzY3JpcHRpb24gaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRzdWJzY3JpcHRpb25zTGFiZWxzOiAnLm0tc2VsZWN0LXN1YnNjcmlwdGlvbiBpbnB1dFt0eXBlPVwicmFkaW9cIl0gKyBsYWJlbCcsXG5cdFx0bWluQW1vdW50czogJy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvciAubWluLWFtb3VudCcsXG5cdFx0ZGVjbGluZVN1YnNjcmlwdGlvbnM6ICcjc3Vic2NyaXB0aW9uLWRlY2xpbmUnXG5cdH07XG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblx0XHRpbml0OiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciAkZnJlcXVlbmN5ID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICk7XG5cdFx0XHR2YXIgJHN1Z2dlc3RlZEFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApO1xuXHRcdFx0dmFyICRhbW91bnQgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQgKTtcblx0XHRcdHZhciAkZGVjbGluZUJlbmVmaXRzID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVCZW5lZml0cyApO1xuXHRcdFx0dmFyICRzdWJzY3JpcHRpb25zID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLnN1YnNjcmlwdGlvbnNTZWxlY3RvciApO1xuXHRcdFx0aWYgKCAhKCAkYW1vdW50Lmxlbmd0aCA+IDAgJiZcblx0XHRcdCAgICAgICAgJGZyZXF1ZW5jeS5sZW5ndGggPiAwICYmXG5cdFx0XHQgICAgICAgICRzdWdnZXN0ZWRBbW91bnQubGVuZ3RoID4gMCApICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIHNldHVwIEFuYWx5dGljcyBFbmhhbmNlZCBFY29tbWVyY2UgcGx1Z2luXG5cdFx0XHRpZiAoIHR5cGVvZiBnYSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGdhKCAncmVxdWlyZScsICdlYycgKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2V0IHVwIHRoZSBVSSBmb3IgdGhlIGN1cnJlbnQgZmllbGQgc3RhdGUgb24gKHJlLSlsb2FkXG5cdFx0XHR0aGlzLnNldEFtb3VudExhYmVscyggJGZyZXF1ZW5jeS5maWx0ZXIoJzpjaGVja2VkJykudmFsKCkgKTtcblx0XHRcdHRoaXMuc2V0TWluQW1vdW50cyggJGZyZXF1ZW5jeS5maWx0ZXIoJzpjaGVja2VkJykudmFsKCkgKTtcblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCgpO1xuXG5cdFx0XHQkZnJlcXVlbmN5Lm9uKCAnY2hhbmdlJywgdGhpcy5vbkZyZXF1ZW5jeUNoYW5nZS5iaW5kKHRoaXMpICk7XG5cdFx0XHQkc3VnZ2VzdGVkQW1vdW50Lm9uKCAnY2hhbmdlJywgdGhpcy5vblN1Z2dlc3RlZEFtb3VudENoYW5nZS5iaW5kKHRoaXMpICk7XG5cdFx0XHQkYW1vdW50Lm9uKCAna2V5dXAgbW91c2V1cCcsIHRoaXMub25BbW91bnRDaGFuZ2UuYmluZCh0aGlzKSApO1xuXG5cdFx0XHRpZiAoICEgKCAkZGVjbGluZUJlbmVmaXRzLmxlbmd0aCA+IDAgJiYgJHN1YnNjcmlwdGlvbnMubGVuZ3RoID4gMCApICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNldCB1cCB0aGUgVUkgZm9yIHRoZSBjdXJyZW50IGZpZWxkIHN0YXRlIG9uIChyZS0pbG9hZFxuXHRcdFx0aWYgKCAkc3Vic2NyaXB0aW9ucy5ub3QoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHRcdCQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHRcdH1cblx0XHRcdHRoaXMub25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UoKTtcblxuXHRcdFx0JGRlY2xpbmVCZW5lZml0cy5vbiggJ2NoYW5nZScsIHRoaXMub25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UuYmluZCggdGhpcyApICk7XG5cdFx0XHQkc3Vic2NyaXB0aW9ucy5vbiggJ2NsaWNrJywgdGhpcy5vblN1YnNjcmlwdGlvbnNDbGljay5iaW5kKCB0aGlzICkgKTtcblx0XHR9LCAvLyBlbmQgaW5pdFxuXG5cdFx0IC8vIHN0ZXAgaXMgdGhlIGludGVnZXIgZm9yIHRoZSBzdGVwIGluIHRoZSBlY29tbWVyY2UgcHJvY2Vzcy5cblx0XHQgLy8gZm9yIHRoaXMgcHVycG9zZSwgaXQncyBwcm9iYWJseSBhbHdheXMgMS5cblx0XHQgLy8gdGhpbmdzIHdlIG5lZWQgdG8ga25vdzogdGhlIGxldmVsIG5hbWUsIHRoZSBhbW91bnQsIGFuZCB0aGUgZnJlcXVlbmN5XG5cdFx0IC8vIGV4YW1wbGU6XG5cdFx0IC8qXG5cdFx0IFJ1bm5pbmcgY29tbWFuZDogZ2EoXCJlYzphZGRQcm9kdWN0XCIsIHtpZDogXCJtaW5ucG9zdF9zaWx2ZXJfbWVtYmVyc2hpcFwiLCBuYW1lOiBcIk1pbm5Qb3N0IFNpbHZlciBNZW1iZXJzaGlwXCIsIGNhdGVnb3J5OiBcIkRvbmF0aW9uXCIsIGJyYW5kOiBcIk1pbm5Qb3N0XCIsIHZhcmlhbnQ6IFwiTW9udGhseVwiLCBwcmljZTogXCI1XCIsIHF1YW50aXR5OiAxfSlcblx0XHQgKi9cblx0XHRhbmFseXRpY3NUcmFja2VyOiBmdW5jdGlvbiggbGV2ZWwsIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsICkge1xuXHRcdFx0aWYgKCB0eXBlb2YgZ2EgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRnYSggJ2VjOmFkZFByb2R1Y3QnLCB7XG5cdFx0XHRcdFx0J2lkJzogJ21pbm5wb3N0XycgKyBsZXZlbC50b0xvd2VyQ2FzZSgpICsgJ19tZW1iZXJzaGlwJyxcblx0XHRcdFx0XHQnbmFtZSc6ICdNaW5uUG9zdCAnICsgbGV2ZWwuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBsZXZlbC5zbGljZSgxKSArICcgTWVtYmVyc2hpcCcsXG5cdFx0XHRcdFx0J2NhdGVnb3J5JzogJ0RvbmF0aW9uJyxcblx0XHRcdFx0XHQnYnJhbmQnOiAnTWlublBvc3QnLFxuXHRcdFx0XHRcdCd2YXJpYW50JzogIGZyZXF1ZW5jeV9sYWJlbCxcblx0XHRcdFx0XHQncHJpY2UnOiBhbW91bnQsXG5cdFx0XHRcdFx0J3F1YW50aXR5JzogMVxuXHRcdFx0XHR9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzVHJhY2tlclxuXG5cdFx0b25GcmVxdWVuY3lDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMuc2V0QW1vdW50TGFiZWxzKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSApO1xuXHRcdFx0dGhpcy5zZXRNaW5BbW91bnRzKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSApO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCk7XG5cdFx0fSwgLy8gZW5kIG9uRnJlcXVlbmN5Q2hhbmdlXG5cblx0XHRvblN1Z2dlc3RlZEFtb3VudENoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0JCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICkudmFsKCBudWxsICk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoKTtcblx0XHR9LCAvLyBlbmQgb25TdWdnZXN0ZWRBbW91bnRDaGFuZ2VcblxuXHRcdG9uQW1vdW50Q2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR0aGlzLmNsZWFyQW1vdW50U2VsZWN0b3IoIGV2ZW50ICk7XG5cblx0XHRcdHZhciAkdGFyZ2V0ID0gJCggZXZlbnQudGFyZ2V0ICk7XG5cdFx0XHRpZiAoICR0YXJnZXQuZGF0YSggJ2xhc3QtdmFsdWUnICkgIT0gJHRhcmdldC52YWwoKSApIHtcblx0XHRcdFx0JHRhcmdldC5kYXRhKCAnbGFzdC12YWx1ZScsICR0YXJnZXQudmFsKCkgKTtcblx0XHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIG9uQW1vdW50Q2hhbmdlXG5cblx0XHRvbkRlY2xpbmVCZW5lZml0c0NoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyICRnaWZ0U2VsZWN0aW9uR3JvdXAgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZ2lmdFNlbGVjdGlvbkdyb3VwICk7XG5cdFx0XHR2YXIgZGVjbGluZSA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lQmVuZWZpdHMgKS5maWx0ZXIoICc6Y2hlY2tlZCcgKS52YWwoKTtcblxuXHRcdFx0aWYgKCBkZWNsaW5lID09PSAndHJ1ZScgKSB7XG5cdFx0XHRcdCRnaWZ0U2VsZWN0aW9uR3JvdXAuaGlkZSgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRnaWZ0U2VsZWN0aW9uR3JvdXAuc2hvdygpO1xuXHRcdH0sIC8vIGVuZCBvbkRlY2xpbmVCZW5lZml0c0NoYW5nZVxuXG5cdFx0b25TdWJzY3JpcHRpb25zQ2xpY2s6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciAkc3Vic2NyaXB0aW9ucyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5zdWJzY3JpcHRpb25zU2VsZWN0b3IgKS5ub3QoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApO1xuXHRcdFx0dmFyICRkZWNsaW5lID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVTdWJzY3JpcHRpb25zICk7XG5cblx0XHRcdGlmICggJCggZXZlbnQudGFyZ2V0ICkuaXMoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApICkge1xuXHRcdFx0XHQkc3Vic2NyaXB0aW9ucy5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JGRlY2xpbmUucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdH0sIC8vIGVuZCBvblN1YnNjcmlwdGlvbnNDaGFuZ2VcblxuXHRcdGNsZWFyQW1vdW50U2VsZWN0b3I6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciAkc3VnZ2VzdGVkQW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yICk7XG5cblx0XHRcdGlmICggJCggZXZlbnQudGFyZ2V0ICkudmFsKCkgPT09ICcnICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRzdWdnZXN0ZWRBbW91bnQucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdH0sIC8vIGVuZCBjbGVhckFtb3VudFNlbGVjdG9yXG5cblx0XHRzZXRBbW91bnRMYWJlbHM6IGZ1bmN0aW9uKCBmcmVxdWVuY3lTdHJpbmcgKSB7XG5cdFx0XHR2YXIgJGdyb3VwcyA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRHcm91cCApO1xuXHRcdFx0dmFyICRzZWxlY3RlZCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApXG5cdFx0XHQgICAgLmZpbHRlciggJzpjaGVja2VkJyApO1xuXHRcdFx0dmFyIGluZGV4ID0gJHNlbGVjdGVkLmRhdGEoICdpbmRleCcgKTtcblxuXHRcdFx0JGdyb3Vwcy5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCRncm91cHMuZmlsdGVyKCAnW2RhdGEtZnJlcXVlbmN5PVwiJyArIGZyZXF1ZW5jeVN0cmluZyArICdcIl0nIClcblx0XHRcdFx0LmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0JHNlbGVjdGVkLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHRcdCRncm91cHMuZmlsdGVyKCAnLmFjdGl2ZScgKVxuXHRcdFx0XHQuZmluZCggJ2lucHV0W3R5cGU9XCJyYWRpb1wiXVtkYXRhLWluZGV4PVwiJyArIGluZGV4ICsgJ1wiXScgKVxuXHRcdFx0XHQucHJvcCggJ2NoZWNrZWQnLCB0cnVlICk7XG5cdFx0fSwgLy8gZW5kIHNldEFtb3VudExhYmVsc1xuXG5cdFx0c2V0TWluQW1vdW50czogZnVuY3Rpb24oIGZyZXF1ZW5jeVN0cmluZyApIHtcblx0XHRcdHZhciAkZWxlbWVudHMgPSAkKCB0aGlzLm9wdGlvbnMubWluQW1vdW50cyApO1xuXHRcdFx0JGVsZW1lbnRzLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0JGVsZW1lbnRzLmZpbHRlciggJ1tkYXRhLWZyZXF1ZW5jeT1cIicgKyBmcmVxdWVuY3lTdHJpbmcgKyAnXCJdJyApXG5cdFx0XHRcdC5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHR9LCAvLyBlbmQgc2V0TWluQW1vdW50c1xuXG5cdFx0Y2hlY2tBbmRTZXRMZXZlbDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgYW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yICkuZmlsdGVyKCAnOmNoZWNrZWQnICkudmFsKCk7XG5cdFx0XHRpZiAoIHR5cGVvZiBhbW91bnQgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRhbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQgKS52YWwoKTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnICkudmFsKCk7XG5cdFx0XHR2YXIgZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdHZhciBmcmVxdWVuY3lfaWQgPSAkKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnICkucHJvcCggJ2lkJyApO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9sYWJlbCA9ICQoICdsYWJlbFtmb3I9XCInICsgZnJlcXVlbmN5X2lkICsgJ1wiXScgKS50ZXh0KCk7XG5cblx0XHRcdHZhciBsZXZlbCA9IE1pbm5Qb3N0TWVtYmVyc2hpcC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUgKTtcblx0XHRcdHRoaXMuc2hvd05ld0xldmVsKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdHRoaXMuc2V0RW5hYmxlZEdpZnRzKCBsZXZlbCApO1xuXHRcdFx0dGhpcy5hbmFseXRpY3NUcmFja2VyKCBsZXZlbFsnbmFtZSddLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCApO1xuXHRcdH0sIC8vIGVuZCBjaGVja0FuZFNldExldmVsXG5cblx0XHRzaG93TmV3TGV2ZWw6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApIHtcblx0XHRcdHZhciBtZW1iZXJfbGV2ZWxfcHJlZml4ID0gJyc7XG5cdFx0XHR2YXIgb2xkX2xldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxWaWV3ZXJDb250YWluZXIgPSBvcHRpb25zLmxldmVsVmlld2VyOyAvLyB0aGlzIHNob3VsZCBjaGFuZ2Ugd2hlbiB3ZSByZXBsYWNlIHRoZSB0ZXh0LCBpZiB0aGVyZSBpcyBhIGxpbmsgaW5zaWRlIGl0XG5cdFx0XHR2YXIgZGVjb2RlSHRtbEVudGl0eSA9IGZ1bmN0aW9uKCBzdHIgKSB7XG5cdFx0XHRcdHJldHVybiBzdHIucmVwbGFjZSggLyYjKFxcZCspOy9nLCBmdW5jdGlvbiggbWF0Y2gsIGRlYyApIHtcblx0XHRcdFx0XHRyZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSggZGVjICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdG1lbWJlcl9sZXZlbF9wcmVmaXggPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEubWVtYmVyX2xldmVsX3ByZWZpeDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmxldmVsVmlld2VyICkubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxWaWV3ZXIpLnByb3AoICdjbGFzcycsICdhLXNob3ctbGV2ZWwgYS1zaG93LWxldmVsLScgKyBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKTtcblxuXHRcdFx0XHRpZiAoICQoIG9wdGlvbnMudXNlckN1cnJlbnRMZXZlbCApLmxlbmd0aCA+IDAgJiYgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHRcdGlmICggJ2EnLCAkKCBvcHRpb25zLmxldmVsVmlld2VyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdGxldmVsVmlld2VyQ29udGFpbmVyID0gb3B0aW9ucy5sZXZlbFZpZXdlciArICcgYSc7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0b2xkX2xldmVsID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwucmVwbGFjZSggbWVtYmVyX2xldmVsX3ByZWZpeCwgJycgKTtcblxuXHRcdFx0XHRcdGlmICggb2xkX2xldmVsICE9PSBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKSB7XG5cdFx0XHRcdFx0XHQkKCBsZXZlbFZpZXdlckNvbnRhaW5lciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5kYXRhKCAnY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoIGxldmVsVmlld2VyQ29udGFpbmVyICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmRhdGEoICdub3QtY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0JChvcHRpb25zLmxldmVsTmFtZSwgb3B0aW9ucy5sZXZlbFZpZXdlcikudGV4dCggbGV2ZWxbJ25hbWUnXSApO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBzaG93TmV3TGV2ZWxcblxuXHRcdHNldEVuYWJsZWRHaWZ0czogZnVuY3Rpb24oIGxldmVsICkge1xuXHRcdFx0dmFyIHNldEVuYWJsZWQgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0JCggdGhpcyApLnByb3AoICdkaXNhYmxlZCcsIGxldmVsLnllYXJseUFtb3VudCA8ICQoIHRoaXMgKS5kYXRhKCAnbWluWWVhcmx5QW1vdW50JyApICk7XG5cdFx0XHR9O1xuXG5cdFx0XHQkKCB0aGlzLm9wdGlvbnMuc3dhZ1NlbGVjdG9yICkuZWFjaCggc2V0RW5hYmxlZCApO1xuXHRcdFx0JCggdGhpcy5vcHRpb25zLnN1YnNjcmlwdGlvbnNTZWxlY3RvciApLmVhY2goIHNldEVuYWJsZWQgKTtcblxuXHRcdFx0aWYgKCAkKCB0aGlzLm9wdGlvbnMuc3dhZ1NlbGVjdG9yICkubm90KCAnI3N3YWctZGVjbGluZScgKS5pcyggJzplbmFibGVkJyApICkge1xuXHRcdFx0XHQkKCAnLnN3YWctZGlzYWJsZWQnICkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoICcuc3dhZy1lbmFibGVkJyApLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JCggJy5zd2FnLWRpc2FibGVkJyApLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHQkKCAnLnN3YWctZW5hYmxlZCcgKS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgc2V0RW5hYmxlZEdpZnRzXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCApO1xuIiwiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBiZW5lZml0Rm9ybSgpIHtcblx0XHRpZiAoIDIgPT09IHBlcmZvcm1hbmNlLm5hdmlnYXRpb24udHlwZSApIHtcblx0XHRcdGxvY2F0aW9uLnJlbG9hZCggdHJ1ZSApO1xuXHRcdH1cblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24uYS1idXR0b24tZGlzYWJsZWQnICkucmVtb3ZlQXR0ciggJ2Rpc2FibGVkJyApO1xuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHZhciAkYnV0dG9uICA9ICQoIHRoaXMgKTtcblx0XHRcdHZhciAkc3RhdHVzICA9ICQoICcubS1iZW5lZml0LW1lc3NhZ2UnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciAkc2VsZWN0ICA9ICQoICdzZWxlY3QnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciBzZXR0aW5ncyA9IG1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3M7XG5cdFx0XHQvLyByZXNldCB0aGUgbWVzc2FnZSBmb3IgY3VycmVudCBzdGF0dXNcblx0XHRcdGlmICggISAnLm0tYmVuZWZpdC1tZXNzYWdlLXN1Y2Nlc3MnICkge1xuXHRcdFx0XHQkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJyApLnJlbW92ZUNsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSBtLWJlbmVmaXQtbWVzc2FnZS1lcnJvciBtLWJlbmVmaXQtbWVzc2FnZS1pbmZvJyApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gc2V0IGJ1dHRvbiB0byBwcm9jZXNzaW5nXG5cdFx0XHQkYnV0dG9uLnRleHQoICdQcm9jZXNzaW5nJyApLmFkZENsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cblx0XHRcdC8vIGRpc2FibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gc2V0IGFqYXggZGF0YVxuXHRcdFx0dmFyIGRhdGEgPSB7fTtcblx0XHRcdHZhciBiZW5lZml0VHlwZSA9ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJyApLnZhbCgpO1xuXHRcdFx0aWYgKCAncGFydG5lci1vZmZlcnMnID09PSBiZW5lZml0VHlwZSApIHtcblx0XHRcdFx0ZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdiZW5lZml0X2Zvcm1fc3VibWl0Jyxcblx0XHRcdFx0XHQnbWlubnBvc3RfbWVtYmVyc2hpcF9iZW5lZml0X2Zvcm1fbm9uY2UnIDogJGJ1dHRvbi5kYXRhKCAnYmVuZWZpdC1ub25jZScgKSxcblx0XHRcdFx0XHQnY3VycmVudF91cmwnIDogJCggJ2lucHV0W25hbWU9XCJjdXJyZW50X3VybFwiXScpLnZhbCgpLFxuXHRcdFx0XHRcdCdiZW5lZml0LW5hbWUnOiAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScpLnZhbCgpLFxuXHRcdFx0XHRcdCdpbnN0YW5jZV9pZCcgOiAkKCAnW25hbWU9XCJpbnN0YW5jZS1pZC0nICsgJGJ1dHRvbi52YWwoKSArICdcIl0nICkudmFsKCksXG5cdFx0XHRcdFx0J3Bvc3RfaWQnIDogJGJ1dHRvbi52YWwoKSxcblx0XHRcdFx0XHQnaXNfYWpheCcgOiAnMScsXG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JC5wb3N0KCBzZXR0aW5ncy5hamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdFx0Ly8gc3VjY2Vzc1xuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdCRzdGF0dXMuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuYWRkQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3MgKTtcblx0XHRcdFx0XHRcdGlmICggMCA8ICRzZWxlY3QubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0XHQkc2VsZWN0LnByb3AoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkuYXR0ciggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBlcnJvclxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnID09PSB0eXBlb2YgcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdCQoICdvcHRpb24nLCAkc2VsZWN0ICkuZWFjaCggZnVuY3Rpb24oIGkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCAkKCB0aGlzICkudmFsKCkgPT09IHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0JCggdGhpcyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIHJlLWVuYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdFx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXHRcdFx0XHRcdFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXHRcdGlmICggMCA8ICQoICcubS1mb3JtLW1lbWJlcnNoaXAtYmVuZWZpdCcgKS5sZW5ndGggKSB7XG5cdFx0XHRiZW5lZml0Rm9ybSgpO1xuXHRcdH1cblx0fSk7XG5cblx0JCggJy5hLXJlZnJlc2gtcGFnZScgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0bG9jYXRpb24ucmVsb2FkKCk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiKCBmdW5jdGlvbiggJCApIHtcblx0ZnVuY3Rpb24gbXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQoIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApIHtcblx0XHRpZiAoIHR5cGVvZiBnYSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRnYSggJ3NlbmQnLCB0eXBlLCBjYXRlZ29yeSwgYWN0aW9uLCBsYWJlbCwgdmFsdWUgKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkgeyBcblx0XHQkKCAnLm0tc3VwcG9ydC1jdGEtdG9wIC5hLXN1cHBvcnQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgdmFsdWUgPSAnJztcblx0XHRcdGlmICggJCggJ3N2ZycsICQoIHRoaXMgKSApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdHZhbHVlID0gJCggJ3N2ZycsICQoIHRoaXMgKSApLmF0dHIoICd0aXRsZScgKSArICcgJztcblx0XHRcdH1cblx0XHRcdHZhbHVlID0gdmFsdWUgKyAkKCB0aGlzICkudGV4dCgpO1xuXHRcdFx0bXBfbWVtYmVyc2hpcF9hbmFseXRpY3NfdHJhY2tpbmdfZXZlbnQoICdldmVudCcsICdTdXBwb3J0IENUQSAtIEhlYWRlcicsICdDbGljazogJyArIHZhbHVlLCBsb2NhdGlvbi5wYXRobmFtZSApO1xuXHRcdH0pO1xuXHR9KTtcblxufSApKCBqUXVlcnkgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCwgdW5kZWZpbmVkICkge1xuXG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHQnZGVidWcnIDogZmFsc2UsIC8vIHRoaXMgY2FuIGJlIHNldCB0byB0cnVlIG9uIHBhZ2UgbGV2ZWwgb3B0aW9uc1xuXHRcdCdhbW91bnRfdmlld2VyJyA6ICcuYW1vdW50IGgzJyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmEtZm9ybS1pdGVtLW1lbWJlcnNoaXAtZnJlcXVlbmN5Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsc190eXBlJyA6ICdzZWxlY3QnLFxuXHRcdCdsZXZlbHNfY29udGFpbmVyJyA6ICcuby1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbHMnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfY29udGFpbmVyJyA6ICcubS1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbCcsXG5cdFx0J3NpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yJyA6ICcubS1tZW1iZXItbGV2ZWwtYnJpZWYnLFxuXHRcdCdmbGlwcGVkX2l0ZW1zJyA6ICdkaXYuYW1vdW50LCBkaXYuZW50ZXInLFxuXHRcdCdsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvcicgOiAnLnNob3ctZnJlcXVlbmN5Jyxcblx0XHQnY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hbW91bnQgLmEtYnV0dG9uLWZsaXAnLFxuXHRcdCdhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuZW50ZXIgaW5wdXQuYW1vdW50LWVudHJ5Jyxcblx0fTsgLy8gZW5kIGRlZmF1bHRzXG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXG5cdFx0aW5pdDogZnVuY3Rpb24oIHJlc2V0LCBhbW91bnQgKSB7XG5cdFx0XHQvLyBQbGFjZSBpbml0aWFsaXphdGlvbiBsb2dpYyBoZXJlXG5cdFx0XHQvLyBZb3UgYWxyZWFkeSBoYXZlIGFjY2VzcyB0byB0aGUgRE9NIGVsZW1lbnQgYW5kXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyB2aWEgdGhlIGluc3RhbmNlLCBlLmcuIHRoaXMuZWxlbWVudFxuXHRcdFx0Ly8gYW5kIHRoaXMub3B0aW9uc1xuXHRcdFx0Ly8geW91IGNhbiBhZGQgbW9yZSBmdW5jdGlvbnMgbGlrZSB0aGUgb25lIGJlbG93IGFuZFxuXHRcdFx0Ly8gY2FsbCB0aGVtIGxpa2Ugc286IHRoaXMueW91ck90aGVyRnVuY3Rpb24odGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpLlxuXHRcdFx0dGhpcy5jYXRjaEhhc2hMaW5rcyggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5sZXZlbEZsaXBwZXIoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN0YXJ0TGV2ZWxDbGljayggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHR9LFxuXG5cdFx0Y2F0Y2hIYXNoTGlua3M6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnYVtocmVmKj1cIiNcIl06bm90KFtocmVmPVwiI1wiXSknLCBlbGVtZW50KS5jbGljayhmdW5jdGlvbihlKSB7XG5cdFx0XHRcdHZhciB0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblx0XHRcdFx0aWYgKHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiYgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpID09IHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpICYmIGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWUpIHtcblx0XHRcdFx0XHR2YXIgdGFyZ2V0ID0gJCh0aGlzLmhhc2gpO1xuXHRcdFx0XHRcdHRhcmdldCA9IHRhcmdldC5sZW5ndGggPyB0YXJnZXQgOiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsnXScpO1xuXHRcdFx0XHRcdGlmICh0YXJnZXQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQkKCdodG1sLGJvZHknKS5hbmltYXRlKHtcblx0XHRcdFx0XHRcdFx0c2Nyb2xsVG9wOiB0YXJnZXQub2Zmc2V0KCkudG9wXG5cdFx0XHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbEZsaXBwZXI6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIGFtb3VudCA9IDA7XG5cdFx0XHR2YXIgbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSAwO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3kgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9ICcnO1xuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxzX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQgKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuZmxpcHBlZF9pdGVtcywgJCh0aGlzKSApLndyYXBBbGwoICc8ZGl2IGNsYXNzPVwiZmxpcHBlclwiLz4nICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCh0aGlzKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0XHRpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBmcmVxdWVuY3kgPT0gMSApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQteWVhcmx5JyApICk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3kgPT0gMTIgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LW1vbnRobHknICkgKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXG5cdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHR0aGF0LmNoYW5nZUZyZXF1ZW5jeSggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJCggb3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IsIGVsZW1lbnQpLnRleHQoZnJlcXVlbmN5X25hbWUpO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkudmFsKCk7XG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGF0LmNoYW5nZUFtb3VudFByZXZpZXcoIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKS5wYXJlbnQoKSApLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGxldmVsRmxpcHBlclxuXG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlICk7XG5cblx0XHRcdCQoJ2gyJywgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWxbJ25hbWUnXSApIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQodGhpcykucGFyZW50KCkucGFyZW50KCkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRjaGFuZ2VGcmVxdWVuY3k6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdFx0dmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0XHR2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdHZhciBmcmVxdWVuY3kgICAgICA9IHBhcnNlSW50KCBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMV0gKTtcblxuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS52YWwoIHNlbGVjdGVkICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnByb3AoICdzZWxlY3RlZCcsIHNlbGVjdGVkICk7XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkuZGF0YSggJ2ZyZXF1ZW5jeScsIGZyZXF1ZW5jeSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUZyZXF1ZW5jeVxuXG5cdFx0Y2hhbmdlQW1vdW50UHJldmlldzogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0XHR2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHRcdHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUFtb3VudFByZXZpZXdcblxuXHRcdHN0YXJ0TGV2ZWxDbGljazogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCcuc3RhcnQtbGV2ZWwnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGxldmVsX2NsYXNzID0gJCggdGhpcyApLnByb3AoICdjbGFzcycgKTtcblx0XHRcdFx0dmFyIGxldmVsX251bWJlciA9IGxldmVsX2NsYXNzW2xldmVsX2NsYXNzLmxlbmd0aCAtMV07XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyLCBlbGVtZW50ICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciArICcgJyArIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwICk7XG4iLCIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50ICkge1xuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RUcmFja1N1Ym1pdCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdHR5cGU6ICdldmVudCcsXG5cdFx0Y2F0ZWdvcnk6ICdTdXBwb3J0IFVzJyxcblx0XHRhY3Rpb246ICdCZWNvbWUgQSBNZW1iZXInLFxuXHRcdGxhYmVsOiBsb2NhdGlvbi5wYXRobmFtZVxuXHR9O1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cdFx0aW5pdDogZnVuY3Rpb24gKCkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG5cblx0XHRcdCQoIHRoaXMuZWxlbWVudCApLnN1Ym1pdCggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHQvLyB0aGlzIHRyYWNrcyBhbiBldmVudCBzdWJtaXNzaW9uIGJhc2VkIG9uIHRoZSBwbHVnaW4gb3B0aW9uc1xuXHRcdFx0XHQvLyBpdCBhbHNvIGJ1YmJsZXMgdGhlIGV2ZW50IHVwIHRvIHN1Ym1pdCB0aGUgZm9ybVxuXHRcdFx0XHR0aGF0LmFuYWx5dGljc0V2ZW50VHJhY2soXG5cdFx0XHRcdFx0b3B0aW9ucy50eXBlLFxuXHRcdFx0XHRcdG9wdGlvbnMuY2F0ZWdvcnksXG5cdFx0XHRcdFx0b3B0aW9ucy5hY3Rpb24sXG5cdFx0XHRcdFx0b3B0aW9ucy5sYWJlbFxuXHRcdFx0XHQpO1xuXHRcdFx0XHQvLyBpZiB0aGlzIGlzIHRoZSBtYWluIGNoZWNrb3V0IGZvcm0sIHNlbmQgaXQgdG8gdGhlIGVjIHBsdWdpbiBhcyBhIGNoZWNrb3V0XG5cdFx0XHRcdHRoYXQuYW5hbHl0aWNzRWNvbW1lcmNlVHJhY2soICQoIHRoYXQuZWxlbWVudCApICk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXG5cdFx0YW5hbHl0aWNzRXZlbnRUcmFjazogZnVuY3Rpb24oIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsLCB2YWx1ZSApIHtcblx0XHRcdGlmICggdHlwZW9mIGdhID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIHR5cGVvZiB2YWx1ZSA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGdhKCAnc2VuZCcsIHR5cGUsIGNhdGVnb3J5LCBhY3Rpb24sIGxhYmVsICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Z2EoICdzZW5kJywgdHlwZSwgY2F0ZWdvcnksIGFjdGlvbiwgbGFiZWwsIHZhbHVlICk7XG5cdFx0fSwgLy8gZW5kIGFuYWx5dGljc0V2ZW50VHJhY2tcblxuXHRcdGFuYWx5dGljc0Vjb21tZXJjZVRyYWNrOiBmdW5jdGlvbiggZWxlbWVudCApIHtcblx0XHRcdGlmICggdHlwZW9mIGdhID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0Z2EoICdyZXF1aXJlJywgJ2VjJyApO1xuXHRcdFx0aWYgKCBlbGVtZW50Lmhhc0NsYXNzKCAnbS1mb3JtLW1lbWJlcnNoaXAtc3VwcG9ydCcgKSApIHtcblx0XHRcdFx0Z2EoICdlYzpzZXRBY3Rpb24nLCAnY2hlY2tvdXQnLCB7XG5cdFx0XHRcdFx0J3N0ZXAnOiAxLFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzRWNvbW1lcmNlVHJhY2tcblxuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50ICk7XG4iXX0=
