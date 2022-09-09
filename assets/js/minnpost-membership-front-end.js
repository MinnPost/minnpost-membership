;(function($) {
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
    checkLevel: function (amount, frequency, type) {
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
    getLevel: function (thisyear) {
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
    swagOrSubscriptionsSelector: '.m-select-subscription-swag_alongside_subscription input[type="radio"]',
    swagOrSubscriptionsLabels: '.m-select-subscription-swag_alongside_subscription input[type="radio"] + label',
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
    init: function () {
      var $frequency = $(this.element).find(this.options.frequencySelector);
      var $form = $(this.element);
      var $suggestedAmount = $(this.options.amountSelector);
      var $amount = $(this.element).find(this.options.amountField);
      var $declineBenefits = $(this.element).find(this.options.declineBenefits);
      var $subscriptions = $(this.element).find(this.options.subscriptionsSelector);
      var $swagOrSubscriptions = $(this.element).find(this.options.swagOrSubscriptionsSelector);

      if (!($amount.length > 0 && $frequency.length > 0 && $suggestedAmount.length > 0)) {
        return;
      } // Set up the UI for the current field state on (re-)load


      this.setAmountLabels($frequency.filter(':checked').val());
      this.setMinAmounts($frequency.filter(':checked').val());
      this.checkAndSetLevel(false);
      $frequency.on('change', this.onFrequencyChange.bind(this));
      $suggestedAmount.on('change', this.onSuggestedAmountChange.bind(this));
      $amount.on('keyup mouseup', this.onAmountChange.bind(this));

      if (!($declineBenefits.length > 0 && $subscriptions.length > 0)) {
        return;
      } // Set up the UI for the current field state on (re-)load


      if ($subscriptions.not(this.options.declineSubscriptions).is(':checked')) {
        $(this.element).find(this.options.declineSubscriptions).prop('checked', false);
      }

      if ($swagOrSubscriptions.not(this.options.declineSubscriptions).is(':checked')) {
        $(this.element).find(this.options.declineSubscriptions).prop('checked', false);
      }

      this.onDeclineBenefitsChange();
      $declineBenefits.on('change', this.onDeclineBenefitsChange.bind(this));
      $subscriptions.on('click', this.onSubscriptionsClick.bind(this)); // when the form is submitted

      document.querySelectorAll(".m-form-membership").forEach(membershipForm => membershipForm.addEventListener("submit", event => {
        this.onFormSubmit(event);
      }));
    },
    // end init

    /*
     * run an analytics product action
    */
    analyticsProductAction: function (level, amount, frequency_label, action, step) {
      var product = this.analyticsProduct(level, amount, frequency_label);
      wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', action, product, step);
    },
    // end analyticsProductAction

    /*
      * create an analytics product variable
     */
    analyticsProduct: function (level, amount, frequency_label) {
      let product = {
        'id': 'minnpost_' + level.toLowerCase() + '_membership',
        'name': 'MinnPost ' + level.charAt(0).toUpperCase() + level.slice(1) + ' Membership',
        'category': 'Donation',
        'brand': 'MinnPost',
        'variant': frequency_label,
        'price': amount,
        'quantity': 1
      };
      return product;
    },
    // end analyticsProduct
    onFrequencyChange: function (event) {
      this.setAmountLabels($(event.target).val());
      this.setMinAmounts($(event.target).val());
      this.checkAndSetLevel(true);
    },
    // end onFrequencyChange
    onSuggestedAmountChange: function (event) {
      $(this.element).find(this.options.amountField).val(null);
      this.checkAndSetLevel(true);
    },
    // end onSuggestedAmountChange
    onAmountChange: function (event) {
      this.clearAmountSelector(event);
      var $target = $(event.target);

      if ($target.data('last-value') != $target.val()) {
        $target.data('last-value', $target.val());
        this.checkAndSetLevel(true);
      }
    },
    // end onAmountChange
    onDeclineBenefitsChange: function (event) {
      var $giftSelectionGroup = $(this.element).find(this.options.giftSelectionGroup);
      var decline = $(this.element).find(this.options.declineBenefits).filter(':checked').val();

      if (decline === 'true') {
        $giftSelectionGroup.hide();
        return;
      }

      $giftSelectionGroup.show();
    },
    // end onDeclineBenefitsChange
    onSubscriptionsClick: function (event) {
      var $subscriptions = $(this.element).find(this.options.subscriptionsSelector).not(this.options.declineSubscriptions);
      var $decline = $(this.element).find(this.options.declineSubscriptions);

      if ($(event.target).is(this.options.declineSubscriptions)) {
        $subscriptions.prop('checked', false);
        return;
      }

      $decline.prop('checked', false);
    },
    // end onSubscriptionsChange
    onFormSubmit: function (event) {
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
      var options = {
        type: 'event',
        category: 'Support Us',
        action: 'Become A Member',
        label: location.pathname
      }; // this tracks an event submission based on the plugin options
      // it also bubbles the event up to submit the form

      wp.hooks.doAction('minnpostMembershipAnalyticsEvent', options.type, options.category, options.action, options.label);
      var hasClass = event.target.classList.contains("m-form-membership-support"); // if this is the main checkout form, send it to the ec plugin as a checkout

      if (hasClass) {
        var product = this.analyticsProduct(level['name'], amount, frequency_label);
        wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', 'add_to_cart', product);
        wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', 'begin_checkout', product);
      }
    },
    // end onFormSubmit
    clearAmountSelector: function (event) {
      var $suggestedAmount = $(this.options.amountSelector);

      if ($(event.target).val() === '') {
        return;
      }

      $suggestedAmount.prop('checked', false);
    },
    // end clearAmountSelector
    setAmountLabels: function (frequencyString) {
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
    setMinAmounts: function (frequencyString) {
      var $elements = $(this.options.minAmounts);
      $elements.removeClass('active');
      $elements.filter('[data-frequency="' + frequencyString + '"]').addClass('active');
    },
    // end setMinAmounts
    checkAndSetLevel: function (updated) {
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
      this.analyticsProductAction(level['name'], amount, frequency_label, 'select_content', 1);
    },
    // end checkAndSetLevel
    showNewLevel: function (element, options, level) {
      var member_level_prefix = '';
      var old_level = '';
      var levelViewerContainer = options.levelViewer; // this should change when we replace the text, if there is a link inside it

      var decodeHtmlEntity = function (str) {
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
    setEnabledGifts: function (level) {
      var setEnabled = function () {
        $(this).prop('disabled', level.yearlyAmount < $(this).data('minYearlyAmount'));
      };

      $(this.options.swagSelector).each(setEnabled);
      $(this.options.subscriptionsSelector).each(setEnabled);
      $(this.options.swagOrSubscriptionsSelector).each(setEnabled);

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

    $('.a-refresh-page').on('click', function (event) {
      event.preventDefault();
      location.reload();
    });
  });
})(jQuery);
"use strict";

const button = document.querySelector('.m-support-cta-top .a-support-button');

if (button) {
  button.addEventListener('click', function (event) {
    var value = '';
    const svg = button.querySelector('svg');

    if (null !== svg) {
      let attribute = svg.getAttribute('title');

      if (null !== attribute) {
        value = attribute + ' ';
      }
    }

    value = value + button.textContent;
    wp.hooks.doAction('minnpostMembershipAnalyticsEvent', 'event', 'Support CTA - Header', 'Click: ' + value, location.pathname);
  });
}
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
    init: function (reset, amount) {
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
    catchHashLinks: function (element, options) {
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
    levelFlipper: function (element, options) {
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
    checkLevel: function (amount, frequency, type, element, options) {
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
    changeFrequency: function (selected, level, element, options) {
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
    changeAmountPreview: function (selected, level, element, options) {
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
    startLevelClick: function (element, options) {
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsIm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCIkIiwiZG9jdW1lbnQiLCJwbHVnaW5OYW1lIiwiZGVmYXVsdHMiLCJmcmVxdWVuY3lTZWxlY3RvciIsImFtb3VudEdyb3VwIiwiYW1vdW50U2VsZWN0b3IiLCJhbW91bnRMYWJlbHMiLCJhbW91bnRWYWx1ZSIsImFtb3VudERlc2NyaXB0aW9uIiwiYW1vdW50RmllbGQiLCJjdXN0b21BbW91bnRGcmVxdWVuY3kiLCJsZXZlbFZpZXdlciIsImxldmVsTmFtZSIsInVzZXJDdXJyZW50TGV2ZWwiLCJkZWNsaW5lQmVuZWZpdHMiLCJnaWZ0U2VsZWN0aW9uR3JvdXAiLCJzd2FnRWxpZ2liaWxpdHlUZXh0Iiwic3dhZ1NlbGVjdG9yIiwic3dhZ0xhYmVscyIsInN1YnNjcmlwdGlvbnNTZWxlY3RvciIsInN1YnNjcmlwdGlvbnNMYWJlbHMiLCJzd2FnT3JTdWJzY3JpcHRpb25zU2VsZWN0b3IiLCJzd2FnT3JTdWJzY3JpcHRpb25zTGFiZWxzIiwibWluQW1vdW50cyIsImRlY2xpbmVTdWJzY3JpcHRpb25zIiwiUGx1Z2luIiwiZWxlbWVudCIsIm9wdGlvbnMiLCJleHRlbmQiLCJfZGVmYXVsdHMiLCJfbmFtZSIsImluaXQiLCIkZnJlcXVlbmN5IiwiZmluZCIsIiRmb3JtIiwiJHN1Z2dlc3RlZEFtb3VudCIsIiRhbW91bnQiLCIkZGVjbGluZUJlbmVmaXRzIiwiJHN1YnNjcmlwdGlvbnMiLCIkc3dhZ09yU3Vic2NyaXB0aW9ucyIsImxlbmd0aCIsInNldEFtb3VudExhYmVscyIsImZpbHRlciIsInZhbCIsInNldE1pbkFtb3VudHMiLCJjaGVja0FuZFNldExldmVsIiwib24iLCJvbkZyZXF1ZW5jeUNoYW5nZSIsImJpbmQiLCJvblN1Z2dlc3RlZEFtb3VudENoYW5nZSIsIm9uQW1vdW50Q2hhbmdlIiwibm90IiwiaXMiLCJwcm9wIiwib25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UiLCJvblN1YnNjcmlwdGlvbnNDbGljayIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJmb3JFYWNoIiwibWVtYmVyc2hpcEZvcm0iLCJhZGRFdmVudExpc3RlbmVyIiwiZXZlbnQiLCJvbkZvcm1TdWJtaXQiLCJhbmFseXRpY3NQcm9kdWN0QWN0aW9uIiwiZnJlcXVlbmN5X2xhYmVsIiwiYWN0aW9uIiwic3RlcCIsInByb2R1Y3QiLCJhbmFseXRpY3NQcm9kdWN0Iiwid3AiLCJob29rcyIsImRvQWN0aW9uIiwidG9Mb3dlckNhc2UiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwidGFyZ2V0IiwiY2xlYXJBbW91bnRTZWxlY3RvciIsIiR0YXJnZXQiLCIkZ2lmdFNlbGVjdGlvbkdyb3VwIiwiZGVjbGluZSIsImhpZGUiLCJzaG93IiwiJGRlY2xpbmUiLCJmcmVxdWVuY3lfc3RyaW5nIiwic3BsaXQiLCJmcmVxdWVuY3lfbmFtZSIsImZyZXF1ZW5jeV9pZCIsInRleHQiLCJjYXRlZ29yeSIsImxhYmVsIiwibG9jYXRpb24iLCJwYXRobmFtZSIsImhhc0NsYXNzIiwiY2xhc3NMaXN0IiwiY29udGFpbnMiLCJmcmVxdWVuY3lTdHJpbmciLCIkZ3JvdXBzIiwiJHNlbGVjdGVkIiwiaW5kZXgiLCIkY3VzdG9tQW1vdW50RnJlcXVlbmN5IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImN1cnJlbnRGcmVxdWVuY3lMYWJlbCIsImZpcnN0IiwiJGVsZW1lbnRzIiwidXBkYXRlZCIsInNob3dOZXdMZXZlbCIsInNldEVuYWJsZWRHaWZ0cyIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbFZpZXdlckNvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJyZXBsYWNlIiwibWF0Y2giLCJkZWMiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJtZW1iZXJfbGV2ZWwiLCJodG1sIiwic2V0RW5hYmxlZCIsInllYXJseUFtb3VudCIsImVhY2giLCJmbiIsImpRdWVyeSIsImJlbmVmaXRGb3JtIiwicGVyZm9ybWFuY2UiLCJuYXZpZ2F0aW9uIiwicmVsb2FkIiwicmVtb3ZlQXR0ciIsImNsaWNrIiwicHJldmVudERlZmF1bHQiLCIkYnV0dG9uIiwiJHN0YXR1cyIsInBhcmVudCIsIiRzZWxlY3QiLCJiZW5lZml0VHlwZSIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwiYnV0dG9uX3ZhbHVlIiwiYnV0dG9uX2xhYmVsIiwiYnV0dG9uX2NsYXNzIiwiYnV0dG9uX2F0dHIiLCJtZXNzYWdlIiwibWVzc2FnZV9jbGFzcyIsImF0dHIiLCJyZW1vdmVfaW5zdGFuY2VfdmFsdWUiLCJpIiwicmVtb3ZlIiwicmVhZHkiLCJidXR0b24iLCJxdWVyeVNlbGVjdG9yIiwidmFsdWUiLCJzdmciLCJhdHRyaWJ1dGUiLCJnZXRBdHRyaWJ1dGUiLCJ0ZXh0Q29udGVudCIsInVuZGVmaW5lZCIsInJlc2V0IiwiY2F0Y2hIYXNoTGlua3MiLCJsZXZlbEZsaXBwZXIiLCJzdGFydExldmVsQ2xpY2siLCJlIiwiaG9zdG5hbWUiLCJoYXNoIiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsIm9mZnNldCIsInRvcCIsInRoYXQiLCJsZXZlbF9udW1iZXIiLCJsZXZlbHNfY29udGFpbmVyIiwic2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IiLCJmbGlwcGVkX2l0ZW1zIiwid3JhcEFsbCIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJzaW5nbGVfbGV2ZWxfY29udGFpbmVyIiwiY2xvc2VzdCIsImFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJhbW91bnRfdmlld2VyIiwiY2hhbmdlRnJlcXVlbmN5IiwibGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IiLCJjaGFuZ2VBbW91bnRQcmV2aWV3IiwiY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJzZWxlY3RlZCIsInJhbmdlIiwibW9udGhfdmFsdWUiLCJ5ZWFyX3ZhbHVlIiwib25jZV92YWx1ZSIsImxldmVsX2NsYXNzIl0sIm1hcHBpbmdzIjoiOztBQUFBOztBQUFDLENBQUMsVUFBV0EsTUFBWCxFQUFvQjtFQUNyQixTQUFTQyxrQkFBVCxDQUE2QkMsSUFBN0IsRUFBbUNDLFFBQW5DLEVBQThDO0lBQzdDLEtBQUtELElBQUwsR0FBWSxFQUFaOztJQUNBLElBQUksT0FBT0EsSUFBUCxLQUFnQixXQUFwQixFQUFpQztNQUNoQyxLQUFLQSxJQUFMLEdBQVlBLElBQVo7SUFDQTs7SUFFRCxLQUFLQyxRQUFMLEdBQWdCLEVBQWhCOztJQUNBLElBQUksT0FBT0EsUUFBUCxLQUFvQixXQUF4QixFQUFxQztNQUNwQyxLQUFLQSxRQUFMLEdBQWdCQSxRQUFoQjtJQUNBOztJQUVELEtBQUtDLGNBQUwsR0FBc0IsRUFBdEI7O0lBQ0EsSUFBSyxPQUFPLEtBQUtGLElBQUwsQ0FBVUcsWUFBakIsS0FBa0MsV0FBbEMsSUFDQSxPQUFPLEtBQUtILElBQUwsQ0FBVUcsWUFBVixDQUF1QkMsZUFBOUIsS0FBa0QsV0FEdkQsRUFDcUU7TUFDcEUsS0FBS0YsY0FB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b3N0LW1lbWJlcnNoaXAtZnJvbnQtZW5kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiOyhmdW5jdGlvbiAoIHdpbmRvdyApIHtcblx0ZnVuY3Rpb24gTWlublBvc3RNZW1iZXJzaGlwKCBkYXRhLCBzZXR0aW5ncyApIHtcblx0XHR0aGlzLmRhdGEgPSB7fTtcblx0XHRpZiAodHlwZW9mIGRhdGEgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aGlzLmRhdGEgPSBkYXRhO1xuXHRcdH1cblxuXHRcdHRoaXMuc2V0dGluZ3MgPSB7fTtcblx0XHRpZiAodHlwZW9mIHNldHRpbmdzICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuXHRcdH1cblxuXHRcdHRoaXMucHJldmlvdXNBbW91bnQgPSAnJztcblx0XHRpZiAoIHR5cGVvZiB0aGlzLmRhdGEuY3VycmVudF91c2VyICE9PSAndW5kZWZpbmVkJyAmJlxuXHRcdCAgICAgdHlwZW9mIHRoaXMuZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50ICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQgPSB0aGlzLmRhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudDtcblx0XHR9XG5cdH1cblxuXHRNaW5uUG9zdE1lbWJlcnNoaXAucHJvdG90eXBlID0ge1xuXHRcdGNoZWNrTGV2ZWw6IGZ1bmN0aW9uKCBhbW91bnQsIGZyZXF1ZW5jeSwgdHlwZSApIHtcblx0XHRcdHZhciB0aGlzeWVhciA9IHBhcnNlSW50KCBhbW91bnQgKSAqIHBhcnNlSW50KCBmcmVxdWVuY3kgKTtcblx0XHRcdGlmICggdHlwZW9mIHRoaXMucHJldmlvdXNBbW91bnQgIT09ICd1bmRlZmluZWQnICYmIHRoaXMucHJldmlvdXNBbW91bnQgIT09ICcnICkge1xuXHRcdFx0XHR2YXIgcHJpb3JfeWVhcl9hbW91bnQgPSBwYXJzZUludCggdGhpcy5wcmV2aW91c0Ftb3VudC5wcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMsIDEwICk7XG5cdFx0XHRcdHZhciBjb21pbmdfeWVhcl9hbW91bnQgPSBwYXJzZUludCggdGhpcy5wcmV2aW91c0Ftb3VudC5jb21pbmdfeWVhcl9jb250cmlidXRpb25zLCAxMCApO1xuXHRcdFx0XHR2YXIgYW5udWFsX3JlY3VycmluZ19hbW91bnQgPSBwYXJzZUludCggdGhpcy5wcmV2aW91c0Ftb3VudC5hbm51YWxfcmVjdXJyaW5nX2Ftb3VudCwgMTAgKTtcblx0XHRcdFx0Ly8gY2FsY3VsYXRlIG1lbWJlciBsZXZlbCBmb3JtdWxhXG5cdFx0XHRcdGlmICggdHlwZSA9PT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRwcmlvcl95ZWFyX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXN5ZWFyID0gTWF0aC5tYXgoIHByaW9yX3llYXJfYW1vdW50LCBjb21pbmdfeWVhcl9hbW91bnQsIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB0aGlzLmdldExldmVsKCB0aGlzeWVhciApO1xuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRnZXRMZXZlbDogZnVuY3Rpb24oIHRoaXN5ZWFyICkge1xuXHRcdFx0dmFyIGxldmVsID0ge1xuXHRcdFx0XHQneWVhcmx5QW1vdW50JzogdGhpc3llYXJcblx0XHRcdH07XG5cdFx0XHRpZiAoIHRoaXN5ZWFyID4gMCAmJiB0aGlzeWVhciA8IDYwICkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0Jyb256ZSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDE7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0aGlzeWVhciA+IDU5ICYmIHRoaXN5ZWFyIDwgMTIwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnU2lsdmVyJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMjtcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAxMTkgJiYgdGhpc3llYXIgPCAyNDApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdHb2xkJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMztcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAyMzkpIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdQbGF0aW51bSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGdldExldmVsXG5cdH07XG5cblx0d2luZG93Lk1pbm5Qb3N0TWVtYmVyc2hpcCA9IG5ldyBNaW5uUG9zdE1lbWJlcnNoaXAoXG5cdFx0d2luZG93Lm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSxcblx0XHR3aW5kb3cubWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5nc1xuXHQpO1xufSkoIHdpbmRvdyApO1xuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwICkge1xuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RBbW91bnRTZWxlY3QnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHRmcmVxdWVuY3lTZWxlY3RvcjogJy5tLWZyZXF1ZW5jeS1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRhbW91bnRHcm91cDogJy5tLWZyZXF1ZW5jeS1ncm91cCcsXG5cdFx0YW1vdW50U2VsZWN0b3I6ICcubS1hbW91bnQtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0YW1vdW50TGFiZWxzOiAnLm0tYW1vdW50LXNlbGVjdCBsYWJlbCcsXG5cdFx0YW1vdW50VmFsdWU6ICdzdHJvbmcnLFxuXHRcdGFtb3VudERlc2NyaXB0aW9uOiAnLmEtYW1vdW50LWRlc2NyaXB0aW9uJyxcblx0XHRhbW91bnRGaWVsZDogJy5hLWFtb3VudC1maWVsZCAjYW1vdW50Jyxcblx0XHRjdXN0b21BbW91bnRGcmVxdWVuY3k6ICcjYW1vdW50LWl0ZW0gLmEtZnJlcXVlbmN5LXRleHQtbGFiZWwnLFxuXHRcdGxldmVsVmlld2VyOiAnLmEtc2hvdy1sZXZlbCcsXG5cdFx0bGV2ZWxOYW1lOiAnLmEtbGV2ZWwnLFxuXHRcdHVzZXJDdXJyZW50TGV2ZWw6ICcuYS1jdXJyZW50LWxldmVsJyxcblx0XHRkZWNsaW5lQmVuZWZpdHM6ICcubS1kZWNsaW5lLWJlbmVmaXRzLXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGdpZnRTZWxlY3Rpb25Hcm91cDogJy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvcicsXG5cdFx0c3dhZ0VsaWdpYmlsaXR5VGV4dDogJy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvciAuc3dhZy1lbGlnaWJpbGl0eScsXG5cdFx0c3dhZ1NlbGVjdG9yOiAnLm0tc2VsZWN0LXN3YWcgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRzd2FnTGFiZWxzOiAnLm0tc2VsZWN0LXN3YWcgaW5wdXRbdHlwZT1cInJhZGlvXCJdICsgbGFiZWwnLFxuXHRcdHN1YnNjcmlwdGlvbnNTZWxlY3RvcjogJy5tLXNlbGVjdC1zdWJzY3JpcHRpb24gaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRzdWJzY3JpcHRpb25zTGFiZWxzOiAnLm0tc2VsZWN0LXN1YnNjcmlwdGlvbiBpbnB1dFt0eXBlPVwicmFkaW9cIl0gKyBsYWJlbCcsXG5cdFx0c3dhZ09yU3Vic2NyaXB0aW9uc1NlbGVjdG9yOiAnLm0tc2VsZWN0LXN1YnNjcmlwdGlvbi1zd2FnX2Fsb25nc2lkZV9zdWJzY3JpcHRpb24gaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRzd2FnT3JTdWJzY3JpcHRpb25zTGFiZWxzOiAnLm0tc2VsZWN0LXN1YnNjcmlwdGlvbi1zd2FnX2Fsb25nc2lkZV9zdWJzY3JpcHRpb24gaW5wdXRbdHlwZT1cInJhZGlvXCJdICsgbGFiZWwnLFxuXHRcdG1pbkFtb3VudHM6ICcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3IgLm1pbi1hbW91bnQnLFxuXHRcdGRlY2xpbmVTdWJzY3JpcHRpb25zOiAnI3N1YnNjcmlwdGlvbi1kZWNsaW5lJ1xuXHR9O1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cdFx0aW5pdDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgJGZyZXF1ZW5jeSA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciApO1xuXHRcdFx0dmFyICRmb3JtID0gJCggdGhpcy5lbGVtZW50ICk7XG5cdFx0XHR2YXIgJHN1Z2dlc3RlZEFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApO1xuXHRcdFx0dmFyICRhbW91bnQgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQgKTtcblx0XHRcdHZhciAkZGVjbGluZUJlbmVmaXRzID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVCZW5lZml0cyApO1xuXHRcdFx0dmFyICRzdWJzY3JpcHRpb25zID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLnN1YnNjcmlwdGlvbnNTZWxlY3RvciApO1xuXHRcdFx0dmFyICRzd2FnT3JTdWJzY3JpcHRpb25zID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLnN3YWdPclN1YnNjcmlwdGlvbnNTZWxlY3RvciApO1xuXHRcdFx0aWYgKCAhKCAkYW1vdW50Lmxlbmd0aCA+IDAgJiZcblx0XHRcdCAgICAgICAgJGZyZXF1ZW5jeS5sZW5ndGggPiAwICYmXG5cdFx0XHQgICAgICAgICRzdWdnZXN0ZWRBbW91bnQubGVuZ3RoID4gMCApICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNldCB1cCB0aGUgVUkgZm9yIHRoZSBjdXJyZW50IGZpZWxkIHN0YXRlIG9uIChyZS0pbG9hZFxuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoICRmcmVxdWVuY3kuZmlsdGVyKCc6Y2hlY2tlZCcpLnZhbCgpICk7XG5cdFx0XHR0aGlzLnNldE1pbkFtb3VudHMoICRmcmVxdWVuY3kuZmlsdGVyKCc6Y2hlY2tlZCcpLnZhbCgpICk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoIGZhbHNlICk7XG5cblx0XHRcdCRmcmVxdWVuY3kub24oICdjaGFuZ2UnLCB0aGlzLm9uRnJlcXVlbmN5Q2hhbmdlLmJpbmQodGhpcykgKTtcblx0XHRcdCRzdWdnZXN0ZWRBbW91bnQub24oICdjaGFuZ2UnLCB0aGlzLm9uU3VnZ2VzdGVkQW1vdW50Q2hhbmdlLmJpbmQodGhpcykgKTtcblx0XHRcdCRhbW91bnQub24oICdrZXl1cCBtb3VzZXVwJywgdGhpcy5vbkFtb3VudENoYW5nZS5iaW5kKHRoaXMpICk7XG5cblx0XHRcdGlmICggISAoICRkZWNsaW5lQmVuZWZpdHMubGVuZ3RoID4gMCAmJiAkc3Vic2NyaXB0aW9ucy5sZW5ndGggPiAwICkgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2V0IHVwIHRoZSBVSSBmb3IgdGhlIGN1cnJlbnQgZmllbGQgc3RhdGUgb24gKHJlLSlsb2FkXG5cdFx0XHRpZiAoICRzdWJzY3JpcHRpb25zLm5vdCggdGhpcy5vcHRpb25zLmRlY2xpbmVTdWJzY3JpcHRpb25zICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdFx0JCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVTdWJzY3JpcHRpb25zICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkc3dhZ09yU3Vic2NyaXB0aW9ucy5ub3QoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHRcdCQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHRcdH1cblx0XHRcdHRoaXMub25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UoKTtcblxuXHRcdFx0JGRlY2xpbmVCZW5lZml0cy5vbiggJ2NoYW5nZScsIHRoaXMub25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UuYmluZCggdGhpcyApICk7XG5cdFx0XHQkc3Vic2NyaXB0aW9ucy5vbiggJ2NsaWNrJywgdGhpcy5vblN1YnNjcmlwdGlvbnNDbGljay5iaW5kKCB0aGlzICkgKTtcblxuXHRcdFx0Ly8gd2hlbiB0aGUgZm9ybSBpcyBzdWJtaXR0ZWRcblx0XHRcdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoIFwiLm0tZm9ybS1tZW1iZXJzaGlwXCIgKS5mb3JFYWNoKFxuXHRcdFx0XHRtZW1iZXJzaGlwRm9ybSA9PiBtZW1iZXJzaGlwRm9ybS5hZGRFdmVudExpc3RlbmVyKCBcInN1Ym1pdFwiLCAoIGV2ZW50ICkgPT4ge1xuXHRcdFx0XHRcdHRoaXMub25Gb3JtU3VibWl0KCBldmVudCApO1xuXHRcdFx0XHR9IClcblx0XHRcdCk7XG5cblx0XHR9LCAvLyBlbmQgaW5pdFxuXG5cdFx0IC8qXG5cdFx0ICAqIHJ1biBhbiBhbmFseXRpY3MgcHJvZHVjdCBhY3Rpb25cblx0XHQgKi9cblx0XHQgYW5hbHl0aWNzUHJvZHVjdEFjdGlvbjogZnVuY3Rpb24oIGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCwgYWN0aW9uLCBzdGVwICkge1xuXHRcdFx0dmFyIHByb2R1Y3QgPSB0aGlzLmFuYWx5dGljc1Byb2R1Y3QobGV2ZWwsIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsICk7XG5cdFx0XHR3cC5ob29rcy5kb0FjdGlvbiggJ21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0Vjb21tZXJjZUFjdGlvbicsICdldmVudCcsIGFjdGlvbiwgcHJvZHVjdCwgc3RlcCApO1xuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NQcm9kdWN0QWN0aW9uXG5cblx0XHQvKlxuXHRcdCAgKiBjcmVhdGUgYW4gYW5hbHl0aWNzIHByb2R1Y3QgdmFyaWFibGVcblx0XHQgKi9cblx0XHRhbmFseXRpY3NQcm9kdWN0OiBmdW5jdGlvbiggbGV2ZWwsIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsICkge1xuXHRcdFx0bGV0IHByb2R1Y3QgPSB7XG5cdFx0XHRcdCdpZCc6ICdtaW5ucG9zdF8nICsgbGV2ZWwudG9Mb3dlckNhc2UoKSArICdfbWVtYmVyc2hpcCcsXG5cdFx0XHRcdCduYW1lJzogJ01pbm5Qb3N0ICcgKyBsZXZlbC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGxldmVsLnNsaWNlKDEpICsgJyBNZW1iZXJzaGlwJyxcblx0XHRcdFx0J2NhdGVnb3J5JzogJ0RvbmF0aW9uJyxcblx0XHRcdFx0J2JyYW5kJzogJ01pbm5Qb3N0Jyxcblx0XHRcdFx0J3ZhcmlhbnQnOiAgZnJlcXVlbmN5X2xhYmVsLFxuXHRcdFx0XHQncHJpY2UnOiBhbW91bnQsXG5cdFx0XHRcdCdxdWFudGl0eSc6IDFcblx0XHRcdH1cblx0XHRcdHJldHVybiBwcm9kdWN0O1xuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NQcm9kdWN0XG5cblx0XHRvbkZyZXF1ZW5jeUNoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoICQoIGV2ZW50LnRhcmdldCApLnZhbCgpICk7XG5cdFx0XHR0aGlzLnNldE1pbkFtb3VudHMoICQoIGV2ZW50LnRhcmdldCApLnZhbCgpICk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoIHRydWUgKTtcblx0XHR9LCAvLyBlbmQgb25GcmVxdWVuY3lDaGFuZ2VcblxuXHRcdG9uU3VnZ2VzdGVkQW1vdW50Q2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHQkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQgKS52YWwoIG51bGwgKTtcblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCggdHJ1ZSk7XG5cdFx0fSwgLy8gZW5kIG9uU3VnZ2VzdGVkQW1vdW50Q2hhbmdlXG5cblx0XHRvbkFtb3VudENoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dGhpcy5jbGVhckFtb3VudFNlbGVjdG9yKCBldmVudCApO1xuXG5cdFx0XHR2YXIgJHRhcmdldCA9ICQoIGV2ZW50LnRhcmdldCApO1xuXHRcdFx0aWYgKCAkdGFyZ2V0LmRhdGEoICdsYXN0LXZhbHVlJyApICE9ICR0YXJnZXQudmFsKCkgKSB7XG5cdFx0XHRcdCR0YXJnZXQuZGF0YSggJ2xhc3QtdmFsdWUnLCAkdGFyZ2V0LnZhbCgpICk7XG5cdFx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCggdHJ1ZSApO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBvbkFtb3VudENoYW5nZVxuXG5cdFx0b25EZWNsaW5lQmVuZWZpdHNDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciAkZ2lmdFNlbGVjdGlvbkdyb3VwID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmdpZnRTZWxlY3Rpb25Hcm91cCApO1xuXHRcdFx0dmFyIGRlY2xpbmUgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZGVjbGluZUJlbmVmaXRzICkuZmlsdGVyKCAnOmNoZWNrZWQnICkudmFsKCk7XG5cblx0XHRcdGlmICggZGVjbGluZSA9PT0gJ3RydWUnICkge1xuXHRcdFx0XHQkZ2lmdFNlbGVjdGlvbkdyb3VwLmhpZGUoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQkZ2lmdFNlbGVjdGlvbkdyb3VwLnNob3coKTtcblx0XHR9LCAvLyBlbmQgb25EZWNsaW5lQmVuZWZpdHNDaGFuZ2VcblxuXHRcdG9uU3Vic2NyaXB0aW9uc0NsaWNrOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgJHN1YnNjcmlwdGlvbnMgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuc3Vic2NyaXB0aW9uc1NlbGVjdG9yICkubm90KCB0aGlzLm9wdGlvbnMuZGVjbGluZVN1YnNjcmlwdGlvbnMgKTtcblx0XHRcdHZhciAkZGVjbGluZSA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApO1xuXG5cdFx0XHRpZiAoICQoIGV2ZW50LnRhcmdldCApLmlzKCB0aGlzLm9wdGlvbnMuZGVjbGluZVN1YnNjcmlwdGlvbnMgKSApIHtcblx0XHRcdFx0JHN1YnNjcmlwdGlvbnMucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRkZWNsaW5lLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHR9LCAvLyBlbmQgb25TdWJzY3JpcHRpb25zQ2hhbmdlXG5cblx0XHRvbkZvcm1TdWJtaXQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciBhbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKS5maWx0ZXIoICc6Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdGlmICggdHlwZW9mIGFtb3VudCA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCApLnZhbCgpO1xuXHRcdFx0fVxuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnICkudmFsKCk7XG5cdFx0XHR2YXIgZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdHZhciBmcmVxdWVuY3lfaWQgPSAkKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnICkucHJvcCggJ2lkJyApO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9sYWJlbCA9ICQoICdsYWJlbFtmb3I9XCInICsgZnJlcXVlbmN5X2lkICsgJ1wiXScgKS50ZXh0KCk7XG5cdFx0XHR2YXIgbGV2ZWwgPSBNaW5uUG9zdE1lbWJlcnNoaXAuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lICk7XG5cblx0XHRcdHZhciBvcHRpb25zID0ge1xuXHRcdFx0XHR0eXBlOiAnZXZlbnQnLFxuXHRcdFx0XHRjYXRlZ29yeTogJ1N1cHBvcnQgVXMnLFxuXHRcdFx0XHRhY3Rpb246ICdCZWNvbWUgQSBNZW1iZXInLFxuXHRcdFx0XHRsYWJlbDogbG9jYXRpb24ucGF0aG5hbWVcblx0XHRcdH07XG5cdFx0XHQvLyB0aGlzIHRyYWNrcyBhbiBldmVudCBzdWJtaXNzaW9uIGJhc2VkIG9uIHRoZSBwbHVnaW4gb3B0aW9uc1xuXHRcdFx0Ly8gaXQgYWxzbyBidWJibGVzIHRoZSBldmVudCB1cCB0byBzdWJtaXQgdGhlIGZvcm1cblx0XHRcdHdwLmhvb2tzLmRvQWN0aW9uKFxuXHRcdFx0XHQnbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRXZlbnQnLFxuXHRcdFx0XHRvcHRpb25zLnR5cGUsXG5cdFx0XHRcdG9wdGlvbnMuY2F0ZWdvcnksXG5cdFx0XHRcdG9wdGlvbnMuYWN0aW9uLFxuXHRcdFx0XHRvcHRpb25zLmxhYmVsXG5cdFx0XHQpO1xuXHRcdFx0dmFyIGhhc0NsYXNzID0gZXZlbnQudGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucyggXCJtLWZvcm0tbWVtYmVyc2hpcC1zdXBwb3J0XCIgKTtcblx0XHRcdC8vIGlmIHRoaXMgaXMgdGhlIG1haW4gY2hlY2tvdXQgZm9ybSwgc2VuZCBpdCB0byB0aGUgZWMgcGx1Z2luIGFzIGEgY2hlY2tvdXRcblx0XHRcdGlmICggaGFzQ2xhc3MgKSB7XG5cdFx0XHRcdHZhciBwcm9kdWN0ID0gdGhpcy5hbmFseXRpY3NQcm9kdWN0KCBsZXZlbFsnbmFtZSddLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCApO1xuXHRcdFx0XHR3cC5ob29rcy5kb0FjdGlvbiggJ21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0Vjb21tZXJjZUFjdGlvbicsICdldmVudCcsICdhZGRfdG9fY2FydCcsIHByb2R1Y3QgKTtcblx0XHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oICdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFY29tbWVyY2VBY3Rpb24nLCAnZXZlbnQnLCAnYmVnaW5fY2hlY2tvdXQnLCBwcm9kdWN0ICk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIG9uRm9ybVN1Ym1pdFxuXG5cdFx0Y2xlYXJBbW91bnRTZWxlY3RvcjogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyICRzdWdnZXN0ZWRBbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKTtcblxuXHRcdFx0aWYgKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSA9PT0gJycgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JHN1Z2dlc3RlZEFtb3VudC5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0fSwgLy8gZW5kIGNsZWFyQW1vdW50U2VsZWN0b3JcblxuXHRcdHNldEFtb3VudExhYmVsczogZnVuY3Rpb24oIGZyZXF1ZW5jeVN0cmluZyApIHtcblx0XHRcdHZhciAkZ3JvdXBzID0gJCggdGhpcy5vcHRpb25zLmFtb3VudEdyb3VwICk7XG5cdFx0XHR2YXIgJHNlbGVjdGVkID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yIClcblx0XHRcdCAgICAuZmlsdGVyKCAnOmNoZWNrZWQnICk7XG5cdFx0XHR2YXIgaW5kZXggPSAkc2VsZWN0ZWQuZGF0YSggJ2luZGV4JyApO1xuXHRcdFx0dmFyICRjdXN0b21BbW91bnRGcmVxdWVuY3kgPSAkKCB0aGlzLm9wdGlvbnMuY3VzdG9tQW1vdW50RnJlcXVlbmN5ICk7XG5cblx0XHRcdCRncm91cHMucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQkZ3JvdXBzLmZpbHRlciggJ1tkYXRhLWZyZXF1ZW5jeT1cIicgKyBmcmVxdWVuY3lTdHJpbmcgKyAnXCJdJyApXG5cdFx0XHRcdC5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCRzZWxlY3RlZC5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0XHQkZ3JvdXBzLmZpbHRlciggJy5hY3RpdmUnIClcblx0XHRcdFx0LmZpbmQoICdpbnB1dFt0eXBlPVwicmFkaW9cIl1bZGF0YS1pbmRleD1cIicgKyBpbmRleCArICdcIl0nIClcblx0XHRcdFx0LnByb3AoICdjaGVja2VkJywgdHJ1ZSApO1xuXG5cdFx0XHR2YXIgY3VycmVudEZyZXF1ZW5jeUxhYmVsID0gJGdyb3Vwcy5maWx0ZXIoICcuYWN0aXZlJyApLmZpbmQoJy5hLWZyZXF1ZW5jeS10ZXh0LWxhYmVsJykuZmlyc3QoKS50ZXh0KCk7XG5cdFx0XHQkY3VzdG9tQW1vdW50RnJlcXVlbmN5LnRleHQoIGN1cnJlbnRGcmVxdWVuY3lMYWJlbCApO1xuXHRcdH0sIC8vIGVuZCBzZXRBbW91bnRMYWJlbHNcblxuXHRcdHNldE1pbkFtb3VudHM6IGZ1bmN0aW9uKCBmcmVxdWVuY3lTdHJpbmcgKSB7XG5cdFx0XHR2YXIgJGVsZW1lbnRzID0gJCggdGhpcy5vcHRpb25zLm1pbkFtb3VudHMgKTtcblx0XHRcdCRlbGVtZW50cy5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCRlbGVtZW50cy5maWx0ZXIoICdbZGF0YS1mcmVxdWVuY3k9XCInICsgZnJlcXVlbmN5U3RyaW5nICsgJ1wiXScgKVxuXHRcdFx0XHQuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0fSwgLy8gZW5kIHNldE1pbkFtb3VudHNcblxuXHRcdGNoZWNrQW5kU2V0TGV2ZWw6IGZ1bmN0aW9uKCB1cGRhdGVkICkge1xuXHRcdFx0dmFyIGFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApLmZpbHRlciggJzpjaGVja2VkJyApLnZhbCgpO1xuXHRcdFx0aWYgKCB0eXBlb2YgYW1vdW50ID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0YW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICkudmFsKCk7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBmcmVxdWVuY3lfc3RyaW5nID0gJCggdGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICsgJzpjaGVja2VkJyApLnZhbCgpO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHR2YXIgZnJlcXVlbmN5X2lkID0gJCggdGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICsgJzpjaGVja2VkJyApLnByb3AoICdpZCcgKTtcblx0XHRcdHZhciBmcmVxdWVuY3lfbGFiZWwgPSAkKCAnbGFiZWxbZm9yPVwiJyArIGZyZXF1ZW5jeV9pZCArICdcIl0nICkudGV4dCgpO1xuXG5cdFx0XHR2YXIgbGV2ZWwgPSBNaW5uUG9zdE1lbWJlcnNoaXAuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lICk7XG5cdFx0XHR0aGlzLnNob3dOZXdMZXZlbCggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMsIGxldmVsICk7XG5cdFx0XHR0aGlzLnNldEVuYWJsZWRHaWZ0cyggbGV2ZWwgKTtcblx0XHRcdHRoaXMuYW5hbHl0aWNzUHJvZHVjdEFjdGlvbiggbGV2ZWxbJ25hbWUnXSwgYW1vdW50LCBmcmVxdWVuY3lfbGFiZWwsICdzZWxlY3RfY29udGVudCcsIDEgKTtcblx0XHR9LCAvLyBlbmQgY2hlY2tBbmRTZXRMZXZlbFxuXG5cdFx0c2hvd05ld0xldmVsOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKSB7XG5cdFx0XHR2YXIgbWVtYmVyX2xldmVsX3ByZWZpeCA9ICcnO1xuXHRcdFx0dmFyIG9sZF9sZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsVmlld2VyQ29udGFpbmVyID0gb3B0aW9ucy5sZXZlbFZpZXdlcjsgLy8gdGhpcyBzaG91bGQgY2hhbmdlIHdoZW4gd2UgcmVwbGFjZSB0aGUgdGV4dCwgaWYgdGhlcmUgaXMgYSBsaW5rIGluc2lkZSBpdFxuXHRcdFx0dmFyIGRlY29kZUh0bWxFbnRpdHkgPSBmdW5jdGlvbiggc3RyICkge1xuXHRcdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoIC8mIyhcXGQrKTsvZywgZnVuY3Rpb24oIG1hdGNoLCBkZWMgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoIGRlYyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRtZW1iZXJfbGV2ZWxfcHJlZml4ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLm1lbWJlcl9sZXZlbF9wcmVmaXg7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0JChvcHRpb25zLmxldmVsVmlld2VyKS5wcm9wKCAnY2xhc3MnLCAnYS1zaG93LWxldmVsIGEtc2hvdy1sZXZlbC0nICsgbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICk7XG5cblx0XHRcdFx0aWYgKCAkKCBvcHRpb25zLnVzZXJDdXJyZW50TGV2ZWwgKS5sZW5ndGggPiAwICYmIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0XHRpZiAoICdhJywgJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHRsZXZlbFZpZXdlckNvbnRhaW5lciA9IG9wdGlvbnMubGV2ZWxWaWV3ZXIgKyAnIGEnO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG9sZF9sZXZlbCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLnJlcGxhY2UoIG1lbWJlcl9sZXZlbF9wcmVmaXgsICcnICk7XG5cblx0XHRcdFx0XHRpZiAoIG9sZF9sZXZlbCAhPT0gbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICkge1xuXHRcdFx0XHRcdFx0JCggbGV2ZWxWaWV3ZXJDb250YWluZXIgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsVmlld2VyICkuZGF0YSggJ2NoYW5nZWQnICkgKSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCBsZXZlbFZpZXdlckNvbnRhaW5lciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5kYXRhKCAnbm90LWNoYW5nZWQnICkgKSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbE5hbWUsIG9wdGlvbnMubGV2ZWxWaWV3ZXIpLnRleHQoIGxldmVsWyduYW1lJ10gKTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgc2hvd05ld0xldmVsXG5cblx0XHRzZXRFbmFibGVkR2lmdHM6IGZ1bmN0aW9uKCBsZXZlbCApIHtcblx0XHRcdHZhciBzZXRFbmFibGVkID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5wcm9wKCAnZGlzYWJsZWQnLCBsZXZlbC55ZWFybHlBbW91bnQgPCAkKCB0aGlzICkuZGF0YSggJ21pblllYXJseUFtb3VudCcgKSApO1xuXHRcdFx0fTtcblxuXHRcdFx0JCggdGhpcy5vcHRpb25zLnN3YWdTZWxlY3RvciApLmVhY2goIHNldEVuYWJsZWQgKTtcblx0XHRcdCQoIHRoaXMub3B0aW9ucy5zdWJzY3JpcHRpb25zU2VsZWN0b3IgKS5lYWNoKCBzZXRFbmFibGVkICk7XG5cdFx0XHQkKCB0aGlzLm9wdGlvbnMuc3dhZ09yU3Vic2NyaXB0aW9uc1NlbGVjdG9yICkuZWFjaCggc2V0RW5hYmxlZCApO1xuXG5cdFx0XHRpZiAoICQoIHRoaXMub3B0aW9ucy5zd2FnU2VsZWN0b3IgKS5ub3QoICcjc3dhZy1kZWNsaW5lJyApLmlzKCAnOmVuYWJsZWQnICkgKSB7XG5cdFx0XHRcdCQoICcuc3dhZy1kaXNhYmxlZCcgKS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0JCggJy5zd2FnLWVuYWJsZWQnICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkKCAnLnN3YWctZGlzYWJsZWQnICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoICcuc3dhZy1lbmFibGVkJyApLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBzZXRFbmFibGVkR2lmdHNcblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwICk7XG4iLCIoIGZ1bmN0aW9uKCAkICkge1xuXG5cdGZ1bmN0aW9uIGJlbmVmaXRGb3JtKCkge1xuXHRcdGlmICggMiA9PT0gcGVyZm9ybWFuY2UubmF2aWdhdGlvbi50eXBlICkge1xuXHRcdFx0bG9jYXRpb24ucmVsb2FkKCB0cnVlICk7XG5cdFx0fVxuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbi5hLWJ1dHRvbi1kaXNhYmxlZCcgKS5yZW1vdmVBdHRyKCAnZGlzYWJsZWQnICk7XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0dmFyICRidXR0b24gID0gJCggdGhpcyApO1xuXHRcdFx0dmFyICRzdGF0dXMgID0gJCggJy5tLWJlbmVmaXQtbWVzc2FnZScsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyICRzZWxlY3QgID0gJCggJ3NlbGVjdCcsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyIHNldHRpbmdzID0gbWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncztcblx0XHRcdC8vIHJlc2V0IHRoZSBtZXNzYWdlIGZvciBjdXJyZW50IHN0YXR1c1xuXHRcdFx0aWYgKCAhICcubS1iZW5lZml0LW1lc3NhZ2Utc3VjY2VzcycgKSB7XG5cdFx0XHRcdCQoICcubS1iZW5lZml0LW1lc3NhZ2UnICkucmVtb3ZlQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlIG0tYmVuZWZpdC1tZXNzYWdlLWVycm9yIG0tYmVuZWZpdC1tZXNzYWdlLWluZm8nICk7XG5cdFx0XHR9XG5cdFx0XHQvLyBzZXQgYnV0dG9uIHRvIHByb2Nlc3Npbmdcblx0XHRcdCRidXR0b24udGV4dCggJ1Byb2Nlc3NpbmcnICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gZGlzYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXG5cdFx0XHQvLyBzZXQgYWpheCBkYXRhXG5cdFx0XHR2YXIgZGF0YSA9IHt9O1xuXHRcdFx0dmFyIGJlbmVmaXRUeXBlID0gJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nICkudmFsKCk7XG5cdFx0XHRpZiAoICdwYXJ0bmVyLW9mZmVycycgPT09IGJlbmVmaXRUeXBlICkge1xuXHRcdFx0XHRkYXRhID0ge1xuXHRcdFx0XHRcdCdhY3Rpb24nIDogJ2JlbmVmaXRfZm9ybV9zdWJtaXQnLFxuXHRcdFx0XHRcdCdtaW5ucG9zdF9tZW1iZXJzaGlwX2JlbmVmaXRfZm9ybV9ub25jZScgOiAkYnV0dG9uLmRhdGEoICdiZW5lZml0LW5vbmNlJyApLFxuXHRcdFx0XHRcdCdjdXJyZW50X3VybCcgOiAkKCAnaW5wdXRbbmFtZT1cImN1cnJlbnRfdXJsXCJdJykudmFsKCksXG5cdFx0XHRcdFx0J2JlbmVmaXQtbmFtZSc6ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJykudmFsKCksXG5cdFx0XHRcdFx0J2luc3RhbmNlX2lkJyA6ICQoICdbbmFtZT1cImluc3RhbmNlLWlkLScgKyAkYnV0dG9uLnZhbCgpICsgJ1wiXScgKS52YWwoKSxcblx0XHRcdFx0XHQncG9zdF9pZCcgOiAkYnV0dG9uLnZhbCgpLFxuXHRcdFx0XHRcdCdpc19hamF4JyA6ICcxJyxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkLnBvc3QoIHNldHRpbmdzLmFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0XHQvLyBzdWNjZXNzXG5cdFx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdFx0XHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHRcdFx0aWYgKCAwIDwgJHNlbGVjdC5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRcdCRzZWxlY3QucHJvcCggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS5hdHRyKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vIGVycm9yXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiByZXNwb25zZS5kYXRhLnJlbW92ZV9pbnN0YW5jZV92YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0JCggJ29wdGlvbicsICRzZWxlY3QgKS5lYWNoKCBmdW5jdGlvbiggaSApIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoICQoIHRoaXMgKS52YWwoKSA9PT0gcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHQkKCB0aGlzICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ly8gcmUtZW5hYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0XHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0XHQkc3RhdHVzLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmFkZENsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzICk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCAwIDwgJCggJy5tLWZvcm0tbWVtYmVyc2hpcC1iZW5lZml0JyApLmxlbmd0aCApIHtcblx0XHRcdGJlbmVmaXRGb3JtKCk7XG5cdFx0fVxuXHRcdCQoICcuYS1yZWZyZXNoLXBhZ2UnICkub24oICdjbGljaycsIGZ1bmN0aW9uICggZXZlbnQgKSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0bG9jYXRpb24ucmVsb2FkKCk7XG5cdFx0fSk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiY29uc3QgYnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciggJy5tLXN1cHBvcnQtY3RhLXRvcCAuYS1zdXBwb3J0LWJ1dHRvbicgKTtcbmlmICggYnV0dG9uICkge1xuXHRidXR0b24uYWRkRXZlbnRMaXN0ZW5lciggJ2NsaWNrJywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdHZhciB2YWx1ZSA9ICcnO1xuXHRcdGNvbnN0IHN2ZyA9IGJ1dHRvbi5xdWVyeVNlbGVjdG9yKCAnc3ZnJyApO1xuXHRcdGlmICggbnVsbCAhPT0gc3ZnICkge1xuXHRcdFx0bGV0IGF0dHJpYnV0ZSA9IHN2Zy5nZXRBdHRyaWJ1dGUoICd0aXRsZScgKTtcblx0XHRcdGlmICggbnVsbCAhPT0gYXR0cmlidXRlICkge1xuXHRcdFx0XHR2YWx1ZSA9IGF0dHJpYnV0ZSArICcgJztcblx0XHRcdH1cblx0XHR9XG5cdFx0dmFsdWUgPSB2YWx1ZSArIGJ1dHRvbi50ZXh0Q29udGVudDtcblx0XHR3cC5ob29rcy5kb0FjdGlvbignbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRXZlbnQnLCAnZXZlbnQnLCAnU3VwcG9ydCBDVEEgLSBIZWFkZXInLCAnQ2xpY2s6ICcgKyB2YWx1ZSwgbG9jYXRpb24ucGF0aG5hbWUpO1xuXHR9KTtcbn1cbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCwgdW5kZWZpbmVkICkge1xuXG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHQnZGVidWcnIDogZmFsc2UsIC8vIHRoaXMgY2FuIGJlIHNldCB0byB0cnVlIG9uIHBhZ2UgbGV2ZWwgb3B0aW9uc1xuXHRcdCdhbW91bnRfdmlld2VyJyA6ICcuYW1vdW50IGgzJyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmEtZm9ybS1pdGVtLW1lbWJlcnNoaXAtZnJlcXVlbmN5Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsc190eXBlJyA6ICdzZWxlY3QnLFxuXHRcdCdsZXZlbHNfY29udGFpbmVyJyA6ICcuby1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbHMnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfY29udGFpbmVyJyA6ICcubS1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbCcsXG5cdFx0J3NpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yJyA6ICcubS1tZW1iZXItbGV2ZWwtYnJpZWYnLFxuXHRcdCdmbGlwcGVkX2l0ZW1zJyA6ICdkaXYuYW1vdW50LCBkaXYuZW50ZXInLFxuXHRcdCdsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvcicgOiAnLnNob3ctZnJlcXVlbmN5Jyxcblx0XHQnY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hbW91bnQgLmEtYnV0dG9uLWZsaXAnLFxuXHRcdCdhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuZW50ZXIgaW5wdXQuYW1vdW50LWVudHJ5Jyxcblx0fTsgLy8gZW5kIGRlZmF1bHRzXG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXG5cdFx0aW5pdDogZnVuY3Rpb24oIHJlc2V0LCBhbW91bnQgKSB7XG5cdFx0XHQvLyBQbGFjZSBpbml0aWFsaXphdGlvbiBsb2dpYyBoZXJlXG5cdFx0XHQvLyBZb3UgYWxyZWFkeSBoYXZlIGFjY2VzcyB0byB0aGUgRE9NIGVsZW1lbnQgYW5kXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyB2aWEgdGhlIGluc3RhbmNlLCBlLmcuIHRoaXMuZWxlbWVudFxuXHRcdFx0Ly8gYW5kIHRoaXMub3B0aW9uc1xuXHRcdFx0Ly8geW91IGNhbiBhZGQgbW9yZSBmdW5jdGlvbnMgbGlrZSB0aGUgb25lIGJlbG93IGFuZFxuXHRcdFx0Ly8gY2FsbCB0aGVtIGxpa2Ugc286IHRoaXMueW91ck90aGVyRnVuY3Rpb24odGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpLlxuXHRcdFx0dGhpcy5jYXRjaEhhc2hMaW5rcyggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5sZXZlbEZsaXBwZXIoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN0YXJ0TGV2ZWxDbGljayggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHR9LFxuXG5cdFx0Y2F0Y2hIYXNoTGlua3M6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnYVtocmVmKj1cIiNcIl06bm90KFtocmVmPVwiI1wiXSknLCBlbGVtZW50KS5jbGljayhmdW5jdGlvbihlKSB7XG5cdFx0XHRcdHZhciB0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblx0XHRcdFx0aWYgKHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiYgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpID09IHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpICYmIGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWUpIHtcblx0XHRcdFx0XHR2YXIgdGFyZ2V0ID0gJCh0aGlzLmhhc2gpO1xuXHRcdFx0XHRcdHRhcmdldCA9IHRhcmdldC5sZW5ndGggPyB0YXJnZXQgOiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsnXScpO1xuXHRcdFx0XHRcdGlmICh0YXJnZXQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQkKCdodG1sLGJvZHknKS5hbmltYXRlKHtcblx0XHRcdFx0XHRcdFx0c2Nyb2xsVG9wOiB0YXJnZXQub2Zmc2V0KCkudG9wXG5cdFx0XHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbEZsaXBwZXI6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIGFtb3VudCA9IDA7XG5cdFx0XHR2YXIgbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSAwO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3kgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9ICcnO1xuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxzX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQgKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuZmxpcHBlZF9pdGVtcywgJCh0aGlzKSApLndyYXBBbGwoICc8ZGl2IGNsYXNzPVwiZmxpcHBlclwiLz4nICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCh0aGlzKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0XHRpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBmcmVxdWVuY3kgPT0gMSApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQteWVhcmx5JyApICk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3kgPT0gMTIgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LW1vbnRobHknICkgKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXG5cdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHR0aGF0LmNoYW5nZUZyZXF1ZW5jeSggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJCggb3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IsIGVsZW1lbnQpLnRleHQoZnJlcXVlbmN5X25hbWUpO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkudmFsKCk7XG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGF0LmNoYW5nZUFtb3VudFByZXZpZXcoIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKS5wYXJlbnQoKSApLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGxldmVsRmxpcHBlclxuXG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlICk7XG5cblx0XHRcdCQoJ2gyJywgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWxbJ25hbWUnXSApIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQodGhpcykucGFyZW50KCkucGFyZW50KCkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRjaGFuZ2VGcmVxdWVuY3k6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdFx0dmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0XHR2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdHZhciBmcmVxdWVuY3kgICAgICA9IHBhcnNlSW50KCBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMV0gKTtcblxuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS52YWwoIHNlbGVjdGVkICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnByb3AoICdzZWxlY3RlZCcsIHNlbGVjdGVkICk7XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkuZGF0YSggJ2ZyZXF1ZW5jeScsIGZyZXF1ZW5jeSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUZyZXF1ZW5jeVxuXG5cdFx0Y2hhbmdlQW1vdW50UHJldmlldzogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0XHR2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHRcdHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUFtb3VudFByZXZpZXdcblxuXHRcdHN0YXJ0TGV2ZWxDbGljazogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCcuc3RhcnQtbGV2ZWwnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGxldmVsX2NsYXNzID0gJCggdGhpcyApLnByb3AoICdjbGFzcycgKTtcblx0XHRcdFx0dmFyIGxldmVsX251bWJlciA9IGxldmVsX2NsYXNzW2xldmVsX2NsYXNzLmxlbmd0aCAtMV07XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyLCBlbGVtZW50ICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciArICcgJyArIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwICk7XG4iXX0=
}(jQuery));
