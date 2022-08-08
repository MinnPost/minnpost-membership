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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsIm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCIkIiwiZG9jdW1lbnQiLCJwbHVnaW5OYW1lIiwiZGVmYXVsdHMiLCJmcmVxdWVuY3lTZWxlY3RvciIsImFtb3VudEdyb3VwIiwiYW1vdW50U2VsZWN0b3IiLCJhbW91bnRMYWJlbHMiLCJhbW91bnRWYWx1ZSIsImFtb3VudERlc2NyaXB0aW9uIiwiYW1vdW50RmllbGQiLCJjdXN0b21BbW91bnRGcmVxdWVuY3kiLCJsZXZlbFZpZXdlciIsImxldmVsTmFtZSIsInVzZXJDdXJyZW50TGV2ZWwiLCJkZWNsaW5lQmVuZWZpdHMiLCJnaWZ0U2VsZWN0aW9uR3JvdXAiLCJzd2FnRWxpZ2liaWxpdHlUZXh0Iiwic3dhZ1NlbGVjdG9yIiwic3dhZ0xhYmVscyIsInN1YnNjcmlwdGlvbnNTZWxlY3RvciIsInN1YnNjcmlwdGlvbnNMYWJlbHMiLCJtaW5BbW91bnRzIiwiZGVjbGluZVN1YnNjcmlwdGlvbnMiLCJQbHVnaW4iLCJlbGVtZW50Iiwib3B0aW9ucyIsImV4dGVuZCIsIl9kZWZhdWx0cyIsIl9uYW1lIiwiaW5pdCIsIiRmcmVxdWVuY3kiLCJmaW5kIiwiJGZvcm0iLCIkc3VnZ2VzdGVkQW1vdW50IiwiJGFtb3VudCIsIiRkZWNsaW5lQmVuZWZpdHMiLCIkc3Vic2NyaXB0aW9ucyIsImxlbmd0aCIsInNldEFtb3VudExhYmVscyIsImZpbHRlciIsInZhbCIsInNldE1pbkFtb3VudHMiLCJjaGVja0FuZFNldExldmVsIiwib24iLCJvbkZyZXF1ZW5jeUNoYW5nZSIsImJpbmQiLCJvblN1Z2dlc3RlZEFtb3VudENoYW5nZSIsIm9uQW1vdW50Q2hhbmdlIiwibm90IiwiaXMiLCJwcm9wIiwib25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UiLCJvblN1YnNjcmlwdGlvbnNDbGljayIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJmb3JFYWNoIiwibWVtYmVyc2hpcEZvcm0iLCJhZGRFdmVudExpc3RlbmVyIiwiZXZlbnQiLCJvbkZvcm1TdWJtaXQiLCJhbmFseXRpY3NQcm9kdWN0QWN0aW9uIiwiZnJlcXVlbmN5X2xhYmVsIiwiYWN0aW9uIiwic3RlcCIsInByb2R1Y3QiLCJhbmFseXRpY3NQcm9kdWN0Iiwid3AiLCJob29rcyIsImRvQWN0aW9uIiwidG9Mb3dlckNhc2UiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwidGFyZ2V0IiwiY2xlYXJBbW91bnRTZWxlY3RvciIsIiR0YXJnZXQiLCIkZ2lmdFNlbGVjdGlvbkdyb3VwIiwiZGVjbGluZSIsImhpZGUiLCJzaG93IiwiJGRlY2xpbmUiLCJmcmVxdWVuY3lfc3RyaW5nIiwic3BsaXQiLCJmcmVxdWVuY3lfbmFtZSIsImZyZXF1ZW5jeV9pZCIsInRleHQiLCJjYXRlZ29yeSIsImxhYmVsIiwibG9jYXRpb24iLCJwYXRobmFtZSIsImhhc0NsYXNzIiwiY2xhc3NMaXN0IiwiY29udGFpbnMiLCJmcmVxdWVuY3lTdHJpbmciLCIkZ3JvdXBzIiwiJHNlbGVjdGVkIiwiaW5kZXgiLCIkY3VzdG9tQW1vdW50RnJlcXVlbmN5IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImN1cnJlbnRGcmVxdWVuY3lMYWJlbCIsImZpcnN0IiwiJGVsZW1lbnRzIiwidXBkYXRlZCIsInNob3dOZXdMZXZlbCIsInNldEVuYWJsZWRHaWZ0cyIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbFZpZXdlckNvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJyZXBsYWNlIiwibWF0Y2giLCJkZWMiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJtZW1iZXJfbGV2ZWwiLCJodG1sIiwic2V0RW5hYmxlZCIsInllYXJseUFtb3VudCIsImVhY2giLCJmbiIsImpRdWVyeSIsImJlbmVmaXRGb3JtIiwicGVyZm9ybWFuY2UiLCJuYXZpZ2F0aW9uIiwicmVsb2FkIiwicmVtb3ZlQXR0ciIsImNsaWNrIiwicHJldmVudERlZmF1bHQiLCIkYnV0dG9uIiwiJHN0YXR1cyIsInBhcmVudCIsIiRzZWxlY3QiLCJiZW5lZml0VHlwZSIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwiYnV0dG9uX3ZhbHVlIiwiYnV0dG9uX2xhYmVsIiwiYnV0dG9uX2NsYXNzIiwiYnV0dG9uX2F0dHIiLCJtZXNzYWdlIiwibWVzc2FnZV9jbGFzcyIsImF0dHIiLCJyZW1vdmVfaW5zdGFuY2VfdmFsdWUiLCJpIiwicmVtb3ZlIiwicmVhZHkiLCJidXR0b24iLCJxdWVyeVNlbGVjdG9yIiwidmFsdWUiLCJzdmciLCJhdHRyaWJ1dGUiLCJnZXRBdHRyaWJ1dGUiLCJ0ZXh0Q29udGVudCIsInVuZGVmaW5lZCIsInJlc2V0IiwiY2F0Y2hIYXNoTGlua3MiLCJsZXZlbEZsaXBwZXIiLCJzdGFydExldmVsQ2xpY2siLCJlIiwiaG9zdG5hbWUiLCJoYXNoIiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsIm9mZnNldCIsInRvcCIsInRoYXQiLCJsZXZlbF9udW1iZXIiLCJsZXZlbHNfY29udGFpbmVyIiwic2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IiLCJmbGlwcGVkX2l0ZW1zIiwid3JhcEFsbCIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJzaW5nbGVfbGV2ZWxfY29udGFpbmVyIiwiY2xvc2VzdCIsImFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJhbW91bnRfdmlld2VyIiwiY2hhbmdlRnJlcXVlbmN5IiwibGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IiLCJjaGFuZ2VBbW91bnRQcmV2aWV3IiwiY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJzZWxlY3RlZCIsInJhbmdlIiwibW9udGhfdmFsdWUiLCJ5ZWFyX3ZhbHVlIiwib25jZV92YWx1ZSIsImxldmVsX2NsYXNzIl0sIm1hcHBpbmdzIjoiOztBQUFBOztBQUFDLENBQUMsVUFBV0EsTUFBWCxFQUFvQjtFQUNyQixTQUFTQyxrQkFBVCxDQUE2QkMsSUFBN0IsRUFBbUNDLFFBQW5DLEVBQThDO0lBQzdDLEtBQUtELElBQUwsR0FBWSxFQUFaOztJQUNBLElBQUksT0FBT0EsSUFBUCxLQUFnQixXQUFwQixFQUFpQztNQUNoQyxLQUFLQSxJQUFMLEdBQVlBLElBQVo7SUFDQTs7SUFFRCxLQUFLQyxRQUFMLEdBQWdCLEVBQWhCOztJQUNBLElBQUksT0FBT0EsUUFBUCxLQUFvQixXQUF4QixFQUFxQztNQUNwQyxLQUFLQSxRQUFMLEdBQWdCQSxRQUFoQjtJQUNBOztJQUVELEtBQUtDLGNBQUwsR0FBc0IsRUFBdEI7O0lBQ0EsSUFBSyxPQUFPLEtBQUtGLElBQUwsQ0FBVUcsWUFBakIsS0FBa0MsV0FBbEMsSUFDQSxPQUFPLEtBQUtILElBQUwsQ0FBVUcsWUFBVixDQUF1QkMsZUFBOUIsS0FBa0QsV0FEdkQsRUFDcUU7TUFDcEUsS0FBS0YsY0FBTCxHQUFzQixLQUFLRixJQUFMLENBQVVHLFlBQVYsQ0FBdUJDLGVBQTdDO0lBQ0E7RUFDRDs7RUFFREwsa0JBQWtCLENBQUNNLFNBQW5CLEdB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QUYsQ0FBS3ZILFVBQUwsSUFBbUIsVUFBV3dCLE9BQVgsRUFBcUI7SUFDdkMsT0FBTyxLQUFLOEYsSUFBTCxDQUFVLFlBQVk7TUFDNUIsSUFBSyxDQUFFeEgsQ0FBQyxDQUFDdkIsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZeUIsVUFBMUIsQ0FBUCxFQUFnRDtRQUMvQ0YsQ0FBQyxDQUFDdkIsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZeUIsVUFBMUIsRUFBc0MsSUFBSXNCLE1BQUosQ0FBWSxJQUFaLEVBQWtCRSxPQUFsQixDQUF0QztNQUNBO0lBQ0QsQ0FKTSxDQUFQO0VBS0EsQ0FORDtBQVFBLENBM05BLEVBMk5HZ0csTUEzTkgsRUEyTlduSixNQTNOWCxFQTJObUIwQixRQTNObkIsRUEyTjZCekIsa0JBM043QiIsImZpbGUiOiJtaW5ucG9zdC1tZW1iZXJzaGlwLWZyb250LWVuZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIjsoZnVuY3Rpb24gKCB3aW5kb3cgKSB7XG5cdGZ1bmN0aW9uIE1pbm5Qb3N0TWVtYmVyc2hpcCggZGF0YSwgc2V0dGluZ3MgKSB7XG5cdFx0dGhpcy5kYXRhID0ge307XG5cdFx0aWYgKHR5cGVvZiBkYXRhICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5kYXRhID0gZGF0YTtcblx0XHR9XG5cblx0XHR0aGlzLnNldHRpbmdzID0ge307XG5cdFx0aWYgKHR5cGVvZiBzZXR0aW5ncyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcblx0XHR9XG5cblx0XHR0aGlzLnByZXZpb3VzQW1vdW50ID0gJyc7XG5cdFx0aWYgKCB0eXBlb2YgdGhpcy5kYXRhLmN1cnJlbnRfdXNlciAhPT0gJ3VuZGVmaW5lZCcgJiZcblx0XHQgICAgIHR5cGVvZiB0aGlzLmRhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHR0aGlzLnByZXZpb3VzQW1vdW50ID0gdGhpcy5kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQ7XG5cdFx0fVxuXHR9XG5cblx0TWlublBvc3RNZW1iZXJzaGlwLnByb3RvdHlwZSA9IHtcblx0XHRjaGVja0xldmVsOiBmdW5jdGlvbiggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUgKSB7XG5cdFx0XHR2YXIgdGhpc3llYXIgPSBwYXJzZUludCggYW1vdW50ICkgKiBwYXJzZUludCggZnJlcXVlbmN5ICk7XG5cdFx0XHRpZiAoIHR5cGVvZiB0aGlzLnByZXZpb3VzQW1vdW50ICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLnByZXZpb3VzQW1vdW50ICE9PSAnJyApIHtcblx0XHRcdFx0dmFyIHByaW9yX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHRoaXMucHJldmlvdXNBbW91bnQucHJpb3JfeWVhcl9jb250cmlidXRpb25zLCAxMCApO1xuXHRcdFx0XHR2YXIgY29taW5nX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHRoaXMucHJldmlvdXNBbW91bnQuY29taW5nX3llYXJfY29udHJpYnV0aW9ucywgMTAgKTtcblx0XHRcdFx0dmFyIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ID0gcGFyc2VJbnQoIHRoaXMucHJldmlvdXNBbW91bnQuYW5udWFsX3JlY3VycmluZ19hbW91bnQsIDEwICk7XG5cdFx0XHRcdC8vIGNhbGN1bGF0ZSBtZW1iZXIgbGV2ZWwgZm9ybXVsYVxuXHRcdFx0XHRpZiAoIHR5cGUgPT09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cHJpb3JfeWVhcl9hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0YW5udWFsX3JlY3VycmluZ19hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGlzeWVhciA9IE1hdGgubWF4KCBwcmlvcl95ZWFyX2Ftb3VudCwgY29taW5nX3llYXJfYW1vdW50LCBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRMZXZlbCggdGhpc3llYXIgKTtcblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Z2V0TGV2ZWw6IGZ1bmN0aW9uKCB0aGlzeWVhciApIHtcblx0XHRcdHZhciBsZXZlbCA9IHtcblx0XHRcdFx0J3llYXJseUFtb3VudCc6IHRoaXN5ZWFyXG5cdFx0XHR9O1xuXHRcdFx0aWYgKCB0aGlzeWVhciA+IDAgJiYgdGhpc3llYXIgPCA2MCApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdCcm9uemUnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAxO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodGhpc3llYXIgPiA1OSAmJiB0aGlzeWVhciA8IDEyMCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1NpbHZlcic7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDI7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMTE5ICYmIHRoaXN5ZWFyIDwgMjQwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnR29sZCc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDM7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMjM5KSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnUGxhdGludW0nO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSA0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBnZXRMZXZlbFxuXHR9O1xuXG5cdHdpbmRvdy5NaW5uUG9zdE1lbWJlcnNoaXAgPSBuZXcgTWlublBvc3RNZW1iZXJzaGlwKFxuXHRcdHdpbmRvdy5taW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEsXG5cdFx0d2luZG93Lm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3Ncblx0KTtcbn0pKCB3aW5kb3cgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCApIHtcblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0QW1vdW50U2VsZWN0Jyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0ZnJlcXVlbmN5U2VsZWN0b3I6ICcubS1mcmVxdWVuY3ktc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0YW1vdW50R3JvdXA6ICcubS1mcmVxdWVuY3ktZ3JvdXAnLFxuXHRcdGFtb3VudFNlbGVjdG9yOiAnLm0tYW1vdW50LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGFtb3VudExhYmVsczogJy5tLWFtb3VudC1zZWxlY3QgbGFiZWwnLFxuXHRcdGFtb3VudFZhbHVlOiAnc3Ryb25nJyxcblx0XHRhbW91bnREZXNjcmlwdGlvbjogJy5hLWFtb3VudC1kZXNjcmlwdGlvbicsXG5cdFx0YW1vdW50RmllbGQ6ICcuYS1hbW91bnQtZmllbGQgI2Ftb3VudCcsXG5cdFx0Y3VzdG9tQW1vdW50RnJlcXVlbmN5OiAnI2Ftb3VudC1pdGVtIC5hLWZyZXF1ZW5jeS10ZXh0LWxhYmVsJyxcblx0XHRsZXZlbFZpZXdlcjogJy5hLXNob3ctbGV2ZWwnLFxuXHRcdGxldmVsTmFtZTogJy5hLWxldmVsJyxcblx0XHR1c2VyQ3VycmVudExldmVsOiAnLmEtY3VycmVudC1sZXZlbCcsXG5cdFx0ZGVjbGluZUJlbmVmaXRzOiAnLm0tZGVjbGluZS1iZW5lZml0cy1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRnaWZ0U2VsZWN0aW9uR3JvdXA6ICcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3InLFxuXHRcdHN3YWdFbGlnaWJpbGl0eVRleHQ6ICcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3IgLnN3YWctZWxpZ2liaWxpdHknLFxuXHRcdHN3YWdTZWxlY3RvcjogJy5tLXNlbGVjdC1zd2FnIGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0c3dhZ0xhYmVsczogJy5tLXNlbGVjdC1zd2FnIGlucHV0W3R5cGU9XCJyYWRpb1wiXSArIGxhYmVsJyxcblx0XHRzdWJzY3JpcHRpb25zU2VsZWN0b3I6ICcubS1zZWxlY3Qtc3Vic2NyaXB0aW9uIGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0c3Vic2NyaXB0aW9uc0xhYmVsczogJy5tLXNlbGVjdC1zdWJzY3JpcHRpb24gaW5wdXRbdHlwZT1cInJhZGlvXCJdICsgbGFiZWwnLFxuXHRcdG1pbkFtb3VudHM6ICcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3IgLm1pbi1hbW91bnQnLFxuXHRcdGRlY2xpbmVTdWJzY3JpcHRpb25zOiAnI3N1YnNjcmlwdGlvbi1kZWNsaW5lJ1xuXHR9O1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cdFx0aW5pdDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgJGZyZXF1ZW5jeSA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciApO1xuXHRcdFx0dmFyICRmb3JtID0gJCggdGhpcy5lbGVtZW50ICk7XG5cdFx0XHR2YXIgJHN1Z2dlc3RlZEFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApO1xuXHRcdFx0dmFyICRhbW91bnQgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQgKTtcblx0XHRcdHZhciAkZGVjbGluZUJlbmVmaXRzID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVCZW5lZml0cyApO1xuXHRcdFx0dmFyICRzdWJzY3JpcHRpb25zID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLnN1YnNjcmlwdGlvbnNTZWxlY3RvciApO1xuXHRcdFx0aWYgKCAhKCAkYW1vdW50Lmxlbmd0aCA+IDAgJiZcblx0XHRcdCAgICAgICAgJGZyZXF1ZW5jeS5sZW5ndGggPiAwICYmXG5cdFx0XHQgICAgICAgICRzdWdnZXN0ZWRBbW91bnQubGVuZ3RoID4gMCApICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNldCB1cCB0aGUgVUkgZm9yIHRoZSBjdXJyZW50IGZpZWxkIHN0YXRlIG9uIChyZS0pbG9hZFxuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoICRmcmVxdWVuY3kuZmlsdGVyKCc6Y2hlY2tlZCcpLnZhbCgpICk7XG5cdFx0XHR0aGlzLnNldE1pbkFtb3VudHMoICRmcmVxdWVuY3kuZmlsdGVyKCc6Y2hlY2tlZCcpLnZhbCgpICk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoIGZhbHNlICk7XG5cblx0XHRcdCRmcmVxdWVuY3kub24oICdjaGFuZ2UnLCB0aGlzLm9uRnJlcXVlbmN5Q2hhbmdlLmJpbmQodGhpcykgKTtcblx0XHRcdCRzdWdnZXN0ZWRBbW91bnQub24oICdjaGFuZ2UnLCB0aGlzLm9uU3VnZ2VzdGVkQW1vdW50Q2hhbmdlLmJpbmQodGhpcykgKTtcblx0XHRcdCRhbW91bnQub24oICdrZXl1cCBtb3VzZXVwJywgdGhpcy5vbkFtb3VudENoYW5nZS5iaW5kKHRoaXMpICk7XG5cblx0XHRcdGlmICggISAoICRkZWNsaW5lQmVuZWZpdHMubGVuZ3RoID4gMCAmJiAkc3Vic2NyaXB0aW9ucy5sZW5ndGggPiAwICkgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2V0IHVwIHRoZSBVSSBmb3IgdGhlIGN1cnJlbnQgZmllbGQgc3RhdGUgb24gKHJlLSlsb2FkXG5cdFx0XHRpZiAoICRzdWJzY3JpcHRpb25zLm5vdCggdGhpcy5vcHRpb25zLmRlY2xpbmVTdWJzY3JpcHRpb25zICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdFx0JCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVTdWJzY3JpcHRpb25zICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5vbkRlY2xpbmVCZW5lZml0c0NoYW5nZSgpO1xuXG5cdFx0XHQkZGVjbGluZUJlbmVmaXRzLm9uKCAnY2hhbmdlJywgdGhpcy5vbkRlY2xpbmVCZW5lZml0c0NoYW5nZS5iaW5kKCB0aGlzICkgKTtcblx0XHRcdCRzdWJzY3JpcHRpb25zLm9uKCAnY2xpY2snLCB0aGlzLm9uU3Vic2NyaXB0aW9uc0NsaWNrLmJpbmQoIHRoaXMgKSApO1xuXG5cdFx0XHQvLyB3aGVuIHRoZSBmb3JtIGlzIHN1Ym1pdHRlZFxuXHRcdFx0ZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCggXCIubS1mb3JtLW1lbWJlcnNoaXBcIiApLmZvckVhY2goXG5cdFx0XHRcdG1lbWJlcnNoaXBGb3JtID0+IG1lbWJlcnNoaXBGb3JtLmFkZEV2ZW50TGlzdGVuZXIoIFwic3VibWl0XCIsICggZXZlbnQgKSA9PiB7XG5cdFx0XHRcdFx0dGhpcy5vbkZvcm1TdWJtaXQoIGV2ZW50ICk7XG5cdFx0XHRcdH0gKVxuXHRcdFx0KTtcblxuXHRcdH0sIC8vIGVuZCBpbml0XG5cblx0XHQgLypcblx0XHQgICogcnVuIGFuIGFuYWx5dGljcyBwcm9kdWN0IGFjdGlvblxuXHRcdCAqL1xuXHRcdCBhbmFseXRpY3NQcm9kdWN0QWN0aW9uOiBmdW5jdGlvbiggbGV2ZWwsIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsLCBhY3Rpb24sIHN0ZXAgKSB7XG5cdFx0XHR2YXIgcHJvZHVjdCA9IHRoaXMuYW5hbHl0aWNzUHJvZHVjdChsZXZlbCwgYW1vdW50LCBmcmVxdWVuY3lfbGFiZWwgKTtcblx0XHRcdHdwLmhvb2tzLmRvQWN0aW9uKCAnbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRWNvbW1lcmNlQWN0aW9uJywgJ2V2ZW50JywgYWN0aW9uLCBwcm9kdWN0LCBzdGVwICk7XG5cdFx0fSwgLy8gZW5kIGFuYWx5dGljc1Byb2R1Y3RBY3Rpb25cblxuXHRcdC8qXG5cdFx0ICAqIGNyZWF0ZSBhbiBhbmFseXRpY3MgcHJvZHVjdCB2YXJpYWJsZVxuXHRcdCAqL1xuXHRcdGFuYWx5dGljc1Byb2R1Y3Q6IGZ1bmN0aW9uKCBsZXZlbCwgYW1vdW50LCBmcmVxdWVuY3lfbGFiZWwgKSB7XG5cdFx0XHRsZXQgcHJvZHVjdCA9IHtcblx0XHRcdFx0J2lkJzogJ21pbm5wb3N0XycgKyBsZXZlbC50b0xvd2VyQ2FzZSgpICsgJ19tZW1iZXJzaGlwJyxcblx0XHRcdFx0J25hbWUnOiAnTWlublBvc3QgJyArIGxldmVsLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgbGV2ZWwuc2xpY2UoMSkgKyAnIE1lbWJlcnNoaXAnLFxuXHRcdFx0XHQnY2F0ZWdvcnknOiAnRG9uYXRpb24nLFxuXHRcdFx0XHQnYnJhbmQnOiAnTWlublBvc3QnLFxuXHRcdFx0XHQndmFyaWFudCc6ICBmcmVxdWVuY3lfbGFiZWwsXG5cdFx0XHRcdCdwcmljZSc6IGFtb3VudCxcblx0XHRcdFx0J3F1YW50aXR5JzogMVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHByb2R1Y3Q7XG5cdFx0fSwgLy8gZW5kIGFuYWx5dGljc1Byb2R1Y3RcblxuXHRcdG9uRnJlcXVlbmN5Q2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR0aGlzLnNldEFtb3VudExhYmVscyggJCggZXZlbnQudGFyZ2V0ICkudmFsKCkgKTtcblx0XHRcdHRoaXMuc2V0TWluQW1vdW50cyggJCggZXZlbnQudGFyZ2V0ICkudmFsKCkgKTtcblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCggdHJ1ZSApO1xuXHRcdH0sIC8vIGVuZCBvbkZyZXF1ZW5jeUNoYW5nZVxuXG5cdFx0b25TdWdnZXN0ZWRBbW91bnRDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdCQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCApLnZhbCggbnVsbCApO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCB0cnVlKTtcblx0XHR9LCAvLyBlbmQgb25TdWdnZXN0ZWRBbW91bnRDaGFuZ2VcblxuXHRcdG9uQW1vdW50Q2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR0aGlzLmNsZWFyQW1vdW50U2VsZWN0b3IoIGV2ZW50ICk7XG5cblx0XHRcdHZhciAkdGFyZ2V0ID0gJCggZXZlbnQudGFyZ2V0ICk7XG5cdFx0XHRpZiAoICR0YXJnZXQuZGF0YSggJ2xhc3QtdmFsdWUnICkgIT0gJHRhcmdldC52YWwoKSApIHtcblx0XHRcdFx0JHRhcmdldC5kYXRhKCAnbGFzdC12YWx1ZScsICR0YXJnZXQudmFsKCkgKTtcblx0XHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCB0cnVlICk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIG9uQW1vdW50Q2hhbmdlXG5cblx0XHRvbkRlY2xpbmVCZW5lZml0c0NoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyICRnaWZ0U2VsZWN0aW9uR3JvdXAgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZ2lmdFNlbGVjdGlvbkdyb3VwICk7XG5cdFx0XHR2YXIgZGVjbGluZSA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lQmVuZWZpdHMgKS5maWx0ZXIoICc6Y2hlY2tlZCcgKS52YWwoKTtcblxuXHRcdFx0aWYgKCBkZWNsaW5lID09PSAndHJ1ZScgKSB7XG5cdFx0XHRcdCRnaWZ0U2VsZWN0aW9uR3JvdXAuaGlkZSgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRnaWZ0U2VsZWN0aW9uR3JvdXAuc2hvdygpO1xuXHRcdH0sIC8vIGVuZCBvbkRlY2xpbmVCZW5lZml0c0NoYW5nZVxuXG5cdFx0b25TdWJzY3JpcHRpb25zQ2xpY2s6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciAkc3Vic2NyaXB0aW9ucyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5zdWJzY3JpcHRpb25zU2VsZWN0b3IgKS5ub3QoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApO1xuXHRcdFx0dmFyICRkZWNsaW5lID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVTdWJzY3JpcHRpb25zICk7XG5cblx0XHRcdGlmICggJCggZXZlbnQudGFyZ2V0ICkuaXMoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApICkge1xuXHRcdFx0XHQkc3Vic2NyaXB0aW9ucy5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JGRlY2xpbmUucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdH0sIC8vIGVuZCBvblN1YnNjcmlwdGlvbnNDaGFuZ2VcblxuXHRcdG9uRm9ybVN1Ym1pdDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIGFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApLmZpbHRlciggJzpjaGVja2VkJyApLnZhbCgpO1xuXHRcdFx0aWYgKCB0eXBlb2YgYW1vdW50ID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0YW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICkudmFsKCk7XG5cdFx0XHR9XG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdHZhciBmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9pZCA9ICQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCcgKS5wcm9wKCAnaWQnICk7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X2xhYmVsID0gJCggJ2xhYmVsW2Zvcj1cIicgKyBmcmVxdWVuY3lfaWQgKyAnXCJdJyApLnRleHQoKTtcblx0XHRcdHZhciBsZXZlbCA9IE1pbm5Qb3N0TWVtYmVyc2hpcC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUgKTtcblxuXHRcdFx0dmFyIG9wdGlvbnMgPSB7XG5cdFx0XHRcdHR5cGU6ICdldmVudCcsXG5cdFx0XHRcdGNhdGVnb3J5OiAnU3VwcG9ydCBVcycsXG5cdFx0XHRcdGFjdGlvbjogJ0JlY29tZSBBIE1lbWJlcicsXG5cdFx0XHRcdGxhYmVsOiBsb2NhdGlvbi5wYXRobmFtZVxuXHRcdFx0fTtcblx0XHRcdC8vIHRoaXMgdHJhY2tzIGFuIGV2ZW50IHN1Ym1pc3Npb24gYmFzZWQgb24gdGhlIHBsdWdpbiBvcHRpb25zXG5cdFx0XHQvLyBpdCBhbHNvIGJ1YmJsZXMgdGhlIGV2ZW50IHVwIHRvIHN1Ym1pdCB0aGUgZm9ybVxuXHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oXG5cdFx0XHRcdCdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFdmVudCcsXG5cdFx0XHRcdG9wdGlvbnMudHlwZSxcblx0XHRcdFx0b3B0aW9ucy5jYXRlZ29yeSxcblx0XHRcdFx0b3B0aW9ucy5hY3Rpb24sXG5cdFx0XHRcdG9wdGlvbnMubGFiZWxcblx0XHRcdCk7XG5cdFx0XHR2YXIgaGFzQ2xhc3MgPSBldmVudC50YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCBcIm0tZm9ybS1tZW1iZXJzaGlwLXN1cHBvcnRcIiApO1xuXHRcdFx0Ly8gaWYgdGhpcyBpcyB0aGUgbWFpbiBjaGVja291dCBmb3JtLCBzZW5kIGl0IHRvIHRoZSBlYyBwbHVnaW4gYXMgYSBjaGVja291dFxuXHRcdFx0aWYgKCBoYXNDbGFzcyApIHtcblx0XHRcdFx0dmFyIHByb2R1Y3QgPSB0aGlzLmFuYWx5dGljc1Byb2R1Y3QoIGxldmVsWyduYW1lJ10sIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsICk7XG5cdFx0XHRcdHdwLmhvb2tzLmRvQWN0aW9uKCAnbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRWNvbW1lcmNlQWN0aW9uJywgJ2V2ZW50JywgJ2FkZF90b19jYXJ0JywgcHJvZHVjdCApO1xuXHRcdFx0XHR3cC5ob29rcy5kb0FjdGlvbiggJ21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0Vjb21tZXJjZUFjdGlvbicsICdldmVudCcsICdiZWdpbl9jaGVja291dCcsIHByb2R1Y3QgKTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgb25Gb3JtU3VibWl0XG5cblx0XHRjbGVhckFtb3VudFNlbGVjdG9yOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgJHN1Z2dlc3RlZEFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApO1xuXG5cdFx0XHRpZiAoICQoIGV2ZW50LnRhcmdldCApLnZhbCgpID09PSAnJyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQkc3VnZ2VzdGVkQW1vdW50LnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHR9LCAvLyBlbmQgY2xlYXJBbW91bnRTZWxlY3RvclxuXG5cdFx0c2V0QW1vdW50TGFiZWxzOiBmdW5jdGlvbiggZnJlcXVlbmN5U3RyaW5nICkge1xuXHRcdFx0dmFyICRncm91cHMgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50R3JvdXAgKTtcblx0XHRcdHZhciAkc2VsZWN0ZWQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKVxuXHRcdFx0ICAgIC5maWx0ZXIoICc6Y2hlY2tlZCcgKTtcblx0XHRcdHZhciBpbmRleCA9ICRzZWxlY3RlZC5kYXRhKCAnaW5kZXgnICk7XG5cdFx0XHR2YXIgJGN1c3RvbUFtb3VudEZyZXF1ZW5jeSA9ICQoIHRoaXMub3B0aW9ucy5jdXN0b21BbW91bnRGcmVxdWVuY3kgKTtcblxuXHRcdFx0JGdyb3Vwcy5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCRncm91cHMuZmlsdGVyKCAnW2RhdGEtZnJlcXVlbmN5PVwiJyArIGZyZXF1ZW5jeVN0cmluZyArICdcIl0nIClcblx0XHRcdFx0LmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0JHNlbGVjdGVkLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHRcdCRncm91cHMuZmlsdGVyKCAnLmFjdGl2ZScgKVxuXHRcdFx0XHQuZmluZCggJ2lucHV0W3R5cGU9XCJyYWRpb1wiXVtkYXRhLWluZGV4PVwiJyArIGluZGV4ICsgJ1wiXScgKVxuXHRcdFx0XHQucHJvcCggJ2NoZWNrZWQnLCB0cnVlICk7XG5cblx0XHRcdHZhciBjdXJyZW50RnJlcXVlbmN5TGFiZWwgPSAkZ3JvdXBzLmZpbHRlciggJy5hY3RpdmUnICkuZmluZCgnLmEtZnJlcXVlbmN5LXRleHQtbGFiZWwnKS5maXJzdCgpLnRleHQoKTtcblx0XHRcdCRjdXN0b21BbW91bnRGcmVxdWVuY3kudGV4dCggY3VycmVudEZyZXF1ZW5jeUxhYmVsICk7XG5cdFx0fSwgLy8gZW5kIHNldEFtb3VudExhYmVsc1xuXG5cdFx0c2V0TWluQW1vdW50czogZnVuY3Rpb24oIGZyZXF1ZW5jeVN0cmluZyApIHtcblx0XHRcdHZhciAkZWxlbWVudHMgPSAkKCB0aGlzLm9wdGlvbnMubWluQW1vdW50cyApO1xuXHRcdFx0JGVsZW1lbnRzLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0JGVsZW1lbnRzLmZpbHRlciggJ1tkYXRhLWZyZXF1ZW5jeT1cIicgKyBmcmVxdWVuY3lTdHJpbmcgKyAnXCJdJyApXG5cdFx0XHRcdC5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHR9LCAvLyBlbmQgc2V0TWluQW1vdW50c1xuXG5cdFx0Y2hlY2tBbmRTZXRMZXZlbDogZnVuY3Rpb24oIHVwZGF0ZWQgKSB7XG5cdFx0XHR2YXIgYW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yICkuZmlsdGVyKCAnOmNoZWNrZWQnICkudmFsKCk7XG5cdFx0XHRpZiAoIHR5cGVvZiBhbW91bnQgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRhbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQgKS52YWwoKTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnICkudmFsKCk7XG5cdFx0XHR2YXIgZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdHZhciBmcmVxdWVuY3lfaWQgPSAkKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnICkucHJvcCggJ2lkJyApO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9sYWJlbCA9ICQoICdsYWJlbFtmb3I9XCInICsgZnJlcXVlbmN5X2lkICsgJ1wiXScgKS50ZXh0KCk7XG5cblx0XHRcdHZhciBsZXZlbCA9IE1pbm5Qb3N0TWVtYmVyc2hpcC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUgKTtcblx0XHRcdHRoaXMuc2hvd05ld0xldmVsKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucywgbGV2ZWwgKTtcblx0XHRcdHRoaXMuc2V0RW5hYmxlZEdpZnRzKCBsZXZlbCApO1xuXHRcdFx0dGhpcy5hbmFseXRpY3NQcm9kdWN0QWN0aW9uKCBsZXZlbFsnbmFtZSddLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCwgJ3NlbGVjdF9jb250ZW50JywgMSApO1xuXHRcdH0sIC8vIGVuZCBjaGVja0FuZFNldExldmVsXG5cblx0XHRzaG93TmV3TGV2ZWw6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zLCBsZXZlbCApIHtcblx0XHRcdHZhciBtZW1iZXJfbGV2ZWxfcHJlZml4ID0gJyc7XG5cdFx0XHR2YXIgb2xkX2xldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxWaWV3ZXJDb250YWluZXIgPSBvcHRpb25zLmxldmVsVmlld2VyOyAvLyB0aGlzIHNob3VsZCBjaGFuZ2Ugd2hlbiB3ZSByZXBsYWNlIHRoZSB0ZXh0LCBpZiB0aGVyZSBpcyBhIGxpbmsgaW5zaWRlIGl0XG5cdFx0XHR2YXIgZGVjb2RlSHRtbEVudGl0eSA9IGZ1bmN0aW9uKCBzdHIgKSB7XG5cdFx0XHRcdHJldHVybiBzdHIucmVwbGFjZSggLyYjKFxcZCspOy9nLCBmdW5jdGlvbiggbWF0Y2gsIGRlYyApIHtcblx0XHRcdFx0XHRyZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSggZGVjICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fTtcblx0XHRcdGlmICggdHlwZW9mIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdG1lbWJlcl9sZXZlbF9wcmVmaXggPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEubWVtYmVyX2xldmVsX3ByZWZpeDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmxldmVsVmlld2VyICkubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxWaWV3ZXIpLnByb3AoICdjbGFzcycsICdhLXNob3ctbGV2ZWwgYS1zaG93LWxldmVsLScgKyBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKTtcblxuXHRcdFx0XHRpZiAoICQoIG9wdGlvbnMudXNlckN1cnJlbnRMZXZlbCApLmxlbmd0aCA+IDAgJiYgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwubGVuZ3RoID4gMCApIHtcblxuXHRcdFx0XHRcdGlmICggJ2EnLCAkKCBvcHRpb25zLmxldmVsVmlld2VyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdGxldmVsVmlld2VyQ29udGFpbmVyID0gb3B0aW9ucy5sZXZlbFZpZXdlciArICcgYSc7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0b2xkX2xldmVsID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLmN1cnJlbnRfdXNlci5tZW1iZXJfbGV2ZWwucmVwbGFjZSggbWVtYmVyX2xldmVsX3ByZWZpeCwgJycgKTtcblxuXHRcdFx0XHRcdGlmICggb2xkX2xldmVsICE9PSBsZXZlbFsnbmFtZSddLnRvTG93ZXJDYXNlKCkgKSB7XG5cdFx0XHRcdFx0XHQkKCBsZXZlbFZpZXdlckNvbnRhaW5lciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5kYXRhKCAnY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoIGxldmVsVmlld2VyQ29udGFpbmVyICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmRhdGEoICdub3QtY2hhbmdlZCcgKSApICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0JChvcHRpb25zLmxldmVsTmFtZSwgb3B0aW9ucy5sZXZlbFZpZXdlcikudGV4dCggbGV2ZWxbJ25hbWUnXSApO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBzaG93TmV3TGV2ZWxcblxuXHRcdHNldEVuYWJsZWRHaWZ0czogZnVuY3Rpb24oIGxldmVsICkge1xuXHRcdFx0dmFyIHNldEVuYWJsZWQgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0JCggdGhpcyApLnByb3AoICdkaXNhYmxlZCcsIGxldmVsLnllYXJseUFtb3VudCA8ICQoIHRoaXMgKS5kYXRhKCAnbWluWWVhcmx5QW1vdW50JyApICk7XG5cdFx0XHR9O1xuXG5cdFx0XHQkKCB0aGlzLm9wdGlvbnMuc3dhZ1NlbGVjdG9yICkuZWFjaCggc2V0RW5hYmxlZCApO1xuXHRcdFx0JCggdGhpcy5vcHRpb25zLnN1YnNjcmlwdGlvbnNTZWxlY3RvciApLmVhY2goIHNldEVuYWJsZWQgKTtcblxuXHRcdFx0aWYgKCAkKCB0aGlzLm9wdGlvbnMuc3dhZ1NlbGVjdG9yICkubm90KCAnI3N3YWctZGVjbGluZScgKS5pcyggJzplbmFibGVkJyApICkge1xuXHRcdFx0XHQkKCAnLnN3YWctZGlzYWJsZWQnICkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoICcuc3dhZy1lbmFibGVkJyApLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JCggJy5zd2FnLWRpc2FibGVkJyApLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHQkKCAnLnN3YWctZW5hYmxlZCcgKS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgc2V0RW5hYmxlZEdpZnRzXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCApO1xuIiwiKCBmdW5jdGlvbiggJCApIHtcblxuXHRmdW5jdGlvbiBiZW5lZml0Rm9ybSgpIHtcblx0XHRpZiAoIDIgPT09IHBlcmZvcm1hbmNlLm5hdmlnYXRpb24udHlwZSApIHtcblx0XHRcdGxvY2F0aW9uLnJlbG9hZCggdHJ1ZSApO1xuXHRcdH1cblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24uYS1idXR0b24tZGlzYWJsZWQnICkucmVtb3ZlQXR0ciggJ2Rpc2FibGVkJyApO1xuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHZhciAkYnV0dG9uICA9ICQoIHRoaXMgKTtcblx0XHRcdHZhciAkc3RhdHVzICA9ICQoICcubS1iZW5lZml0LW1lc3NhZ2UnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciAkc2VsZWN0ICA9ICQoICdzZWxlY3QnLCAkKCB0aGlzICkucGFyZW50KCkgKTtcblx0XHRcdHZhciBzZXR0aW5ncyA9IG1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3M7XG5cdFx0XHQvLyByZXNldCB0aGUgbWVzc2FnZSBmb3IgY3VycmVudCBzdGF0dXNcblx0XHRcdGlmICggISAnLm0tYmVuZWZpdC1tZXNzYWdlLXN1Y2Nlc3MnICkge1xuXHRcdFx0XHQkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJyApLnJlbW92ZUNsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSBtLWJlbmVmaXQtbWVzc2FnZS1lcnJvciBtLWJlbmVmaXQtbWVzc2FnZS1pbmZvJyApO1xuXHRcdFx0fVxuXHRcdFx0Ly8gc2V0IGJ1dHRvbiB0byBwcm9jZXNzaW5nXG5cdFx0XHQkYnV0dG9uLnRleHQoICdQcm9jZXNzaW5nJyApLmFkZENsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cblx0XHRcdC8vIGRpc2FibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gc2V0IGFqYXggZGF0YVxuXHRcdFx0dmFyIGRhdGEgPSB7fTtcblx0XHRcdHZhciBiZW5lZml0VHlwZSA9ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJyApLnZhbCgpO1xuXHRcdFx0aWYgKCAncGFydG5lci1vZmZlcnMnID09PSBiZW5lZml0VHlwZSApIHtcblx0XHRcdFx0ZGF0YSA9IHtcblx0XHRcdFx0XHQnYWN0aW9uJyA6ICdiZW5lZml0X2Zvcm1fc3VibWl0Jyxcblx0XHRcdFx0XHQnbWlubnBvc3RfbWVtYmVyc2hpcF9iZW5lZml0X2Zvcm1fbm9uY2UnIDogJGJ1dHRvbi5kYXRhKCAnYmVuZWZpdC1ub25jZScgKSxcblx0XHRcdFx0XHQnY3VycmVudF91cmwnIDogJCggJ2lucHV0W25hbWU9XCJjdXJyZW50X3VybFwiXScpLnZhbCgpLFxuXHRcdFx0XHRcdCdiZW5lZml0LW5hbWUnOiAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScpLnZhbCgpLFxuXHRcdFx0XHRcdCdpbnN0YW5jZV9pZCcgOiAkKCAnW25hbWU9XCJpbnN0YW5jZS1pZC0nICsgJGJ1dHRvbi52YWwoKSArICdcIl0nICkudmFsKCksXG5cdFx0XHRcdFx0J3Bvc3RfaWQnIDogJGJ1dHRvbi52YWwoKSxcblx0XHRcdFx0XHQnaXNfYWpheCcgOiAnMScsXG5cdFx0XHRcdH07XG5cblx0XHRcdFx0JC5wb3N0KCBzZXR0aW5ncy5hamF4dXJsLCBkYXRhLCBmdW5jdGlvbiggcmVzcG9uc2UgKSB7XG5cdFx0XHRcdFx0Ly8gc3VjY2Vzc1xuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gcmVzcG9uc2Uuc3VjY2VzcyApIHtcblx0XHRcdFx0XHRcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdCRzdGF0dXMuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuYWRkQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3MgKTtcblx0XHRcdFx0XHRcdGlmICggMCA8ICRzZWxlY3QubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0XHQkc2VsZWN0LnByb3AoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkuYXR0ciggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQvLyBlcnJvclxuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnID09PSB0eXBlb2YgcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdCQoICdvcHRpb24nLCAkc2VsZWN0ICkuZWFjaCggZnVuY3Rpb24oIGkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKCAkKCB0aGlzICkudmFsKCkgPT09IHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0JCggdGhpcyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdGlmICggJycgIT09IHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5oaWRlKCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8vIHJlLWVuYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdFx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5ub3QoICRidXR0b24gKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXHRcdFx0XHRcdFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9KTtcblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXHRcdGlmICggMCA8ICQoICcubS1mb3JtLW1lbWJlcnNoaXAtYmVuZWZpdCcgKS5sZW5ndGggKSB7XG5cdFx0XHRiZW5lZml0Rm9ybSgpO1xuXHRcdH1cblx0XHQkKCAnLmEtcmVmcmVzaC1wYWdlJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbiAoIGV2ZW50ICkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGxvY2F0aW9uLnJlbG9hZCgpO1xuXHRcdH0pO1xuXHR9KTtcblxufSApKCBqUXVlcnkgKTtcbiIsImNvbnN0IGJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoICcubS1zdXBwb3J0LWN0YS10b3AgLmEtc3VwcG9ydC1idXR0b24nICk7XG5pZiAoIGJ1dHRvbiApIHtcblx0YnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoICdjbGljaycsIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHR2YXIgdmFsdWUgPSAnJztcblx0XHRjb25zdCBzdmcgPSBidXR0b24ucXVlcnlTZWxlY3RvciggJ3N2ZycgKTtcblx0XHRpZiAoIG51bGwgIT09IHN2ZyApIHtcblx0XHRcdGxldCBhdHRyaWJ1dGUgPSBzdmcuZ2V0QXR0cmlidXRlKCAndGl0bGUnICk7XG5cdFx0XHRpZiAoIG51bGwgIT09IGF0dHJpYnV0ZSApIHtcblx0XHRcdFx0dmFsdWUgPSBhdHRyaWJ1dGUgKyAnICc7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHZhbHVlID0gdmFsdWUgKyBidXR0b24udGV4dENvbnRlbnQ7XG5cdFx0d3AuaG9va3MuZG9BY3Rpb24oJ21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0V2ZW50JywgJ2V2ZW50JywgJ1N1cHBvcnQgQ1RBIC0gSGVhZGVyJywgJ0NsaWNrOiAnICsgdmFsdWUsIGxvY2F0aW9uLnBhdGhuYW1lKTtcblx0fSk7XG59XG4iLCIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXAsIHVuZGVmaW5lZCApIHtcblxuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RNZW1iZXJzaGlwJyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0J2RlYnVnJyA6IGZhbHNlLCAvLyB0aGlzIGNhbiBiZSBzZXQgdG8gdHJ1ZSBvbiBwYWdlIGxldmVsIG9wdGlvbnNcblx0XHQnYW1vdW50X3ZpZXdlcicgOiAnLmFtb3VudCBoMycsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hLWZvcm0taXRlbS1tZW1iZXJzaGlwLWZyZXF1ZW5jeScsXG5cdFx0J2ZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHNfdHlwZScgOiAnc2VsZWN0Jyxcblx0XHQnbGV2ZWxzX2NvbnRhaW5lcicgOiAnLm8tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWxzJyxcblx0XHQnc2luZ2xlX2xldmVsX2NvbnRhaW5lcicgOiAnLm0tbWVtYmVyc2hpcC1tZW1iZXItbGV2ZWwnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcicgOiAnLm0tbWVtYmVyLWxldmVsLWJyaWVmJyxcblx0XHQnZmxpcHBlZF9pdGVtcycgOiAnZGl2LmFtb3VudCwgZGl2LmVudGVyJyxcblx0XHQnbGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3InIDogJy5zaG93LWZyZXF1ZW5jeScsXG5cdFx0J2Nob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYW1vdW50IC5hLWJ1dHRvbi1mbGlwJyxcblx0XHQnYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmVudGVyIGlucHV0LmFtb3VudC1lbnRyeScsXG5cdH07IC8vIGVuZCBkZWZhdWx0c1xuXG5cdC8vIFRoZSBhY3R1YWwgcGx1Z2luIGNvbnN0cnVjdG9yXG5cdGZ1bmN0aW9uIFBsdWdpbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblxuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblxuXHRcdGluaXQ6IGZ1bmN0aW9uKCByZXNldCwgYW1vdW50ICkge1xuXHRcdFx0Ly8gUGxhY2UgaW5pdGlhbGl6YXRpb24gbG9naWMgaGVyZVxuXHRcdFx0Ly8gWW91IGFscmVhZHkgaGF2ZSBhY2Nlc3MgdG8gdGhlIERPTSBlbGVtZW50IGFuZFxuXHRcdFx0Ly8gdGhlIG9wdGlvbnMgdmlhIHRoZSBpbnN0YW5jZSwgZS5nLiB0aGlzLmVsZW1lbnRcblx0XHRcdC8vIGFuZCB0aGlzLm9wdGlvbnNcblx0XHRcdC8vIHlvdSBjYW4gYWRkIG1vcmUgZnVuY3Rpb25zIGxpa2UgdGhlIG9uZSBiZWxvdyBhbmRcblx0XHRcdC8vIGNhbGwgdGhlbSBsaWtlIHNvOiB0aGlzLnlvdXJPdGhlckZ1bmN0aW9uKHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKS5cblx0XHRcdHRoaXMuY2F0Y2hIYXNoTGlua3MoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zKTtcblx0XHRcdHRoaXMubGV2ZWxGbGlwcGVyKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdFx0dGhpcy5zdGFydExldmVsQ2xpY2soIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0fSxcblxuXHRcdGNhdGNoSGFzaExpbmtzOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJ2FbaHJlZio9XCIjXCJdOm5vdChbaHJlZj1cIiNcIl0pJywgZWxlbWVudCkuY2xpY2soZnVuY3Rpb24oZSkge1xuXHRcdFx0XHR2YXIgdGFyZ2V0ID0gJChlLnRhcmdldCk7XG5cdFx0XHRcdGlmICh0YXJnZXQucGFyZW50KCcuY29tbWVudC10aXRsZScpLmxlbmd0aCA9PSAwICYmIGxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSA9PSB0aGlzLnBhdGhuYW1lLnJlcGxhY2UoL15cXC8vLCcnKSAmJiBsb2NhdGlvbi5ob3N0bmFtZSA9PSB0aGlzLmhvc3RuYW1lKSB7XG5cdFx0XHRcdFx0dmFyIHRhcmdldCA9ICQodGhpcy5oYXNoKTtcblx0XHRcdFx0XHR0YXJnZXQgPSB0YXJnZXQubGVuZ3RoID8gdGFyZ2V0IDogJCgnW25hbWU9JyArIHRoaXMuaGFzaC5zbGljZSgxKSArJ10nKTtcblx0XHRcdFx0XHRpZiAodGFyZ2V0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0JCgnaHRtbCxib2R5JykuYW5pbWF0ZSh7XG5cdFx0XHRcdFx0XHRcdHNjcm9sbFRvcDogdGFyZ2V0Lm9mZnNldCgpLnRvcFxuXHRcdFx0XHRcdFx0fSwgMTAwMCk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgY2F0Y2hMaW5rc1xuXG5cdFx0bGV2ZWxGbGlwcGVyOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdHZhciB0aGF0ID0gdGhpcztcblx0XHRcdHZhciBhbW91bnQgPSAwO1xuXHRcdFx0dmFyIGxldmVsID0gJyc7XG5cdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gMDtcblx0XHRcdHZhciBmcmVxdWVuY3lfc3RyaW5nID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5ID0gJyc7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSAnJztcblxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmxldmVsc19jb250YWluZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50ICkuZWFjaChmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmZsaXBwZWRfaXRlbXMsICQodGhpcykgKS53cmFwQWxsKCAnPGRpdiBjbGFzcz1cImZsaXBwZXJcIi8+JyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkub24oJ2NoYW5nZScsIGZ1bmN0aW9uIChldmVudCkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQodGhpcykuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKHRoaXMpLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdFx0aWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblxuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cblx0XHRcdFx0XHRcdGlmICggZnJlcXVlbmN5ID09IDEgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LXllYXJseScgKSApO1xuXHRcdFx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5ID09IDEyICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC1tb250aGx5JyApICk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblxuXHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0dGhhdC5jaGFuZ2VGcmVxdWVuY3koIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoICQoIG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdFx0JChvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yLCBlbGVtZW50KS50ZXh0KGZyZXF1ZW5jeV9uYW1lKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdFx0XHRpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLnZhbCgpO1xuXHRcdFx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dGhhdC5jaGFuZ2VBbW91bnRQcmV2aWV3KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoICQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHQkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJChvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykucGFyZW50KCkgKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBsZXZlbEZsaXBwZXJcblxuXHRcdGNoZWNrTGV2ZWw6IGZ1bmN0aW9uKCBhbW91bnQsIGZyZXF1ZW5jeSwgdHlwZSwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdHZhciBsZXZlbCA9IE1pbm5Qb3N0TWVtYmVyc2hpcC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgdHlwZSApO1xuXG5cdFx0XHQkKCdoMicsIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IpLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoICQodGhpcykudGV4dCgpID09IGxldmVsWyduYW1lJ10gKSB7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHQkKHRoaXMpLnBhcmVudCgpLnBhcmVudCgpLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Y2hhbmdlRnJlcXVlbmN5OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHRcdHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdFx0dmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHR2YXIgZnJlcXVlbmN5ICAgICAgPSBwYXJzZUludCggc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzFdICk7XG5cblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkudmFsKCBzZWxlY3RlZCApO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS5wcm9wKCAnc2VsZWN0ZWQnLCBzZWxlY3RlZCApO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKSApLmRhdGEoICdmcmVxdWVuY3knLCBmcmVxdWVuY3kgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VGcmVxdWVuY3lcblxuXHRcdGNoYW5nZUFtb3VudFByZXZpZXc6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdFx0dmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0XHR2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblxuXHRcdFx0fSApO1xuXHRcdH0sIC8vIGVuZCBjaGFuZ2VBbW91bnRQcmV2aWV3XG5cblx0XHRzdGFydExldmVsQ2xpY2s6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnLnN0YXJ0LWxldmVsJykuY2xpY2soZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciBsZXZlbF9jbGFzcyA9ICQoIHRoaXMgKS5wcm9wKCAnY2xhc3MnICk7XG5cdFx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSBsZXZlbF9jbGFzc1tsZXZlbF9jbGFzcy5sZW5ndGggLTFdO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciwgZWxlbWVudCApLmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKyAnICcgKyBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIHN0YXJ0TGV2ZWxDbGlja1xuXG5cdH07IC8vIGVuZCBQbHVnaW4ucHJvdG90eXBlXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG5cbn0pKCBqUXVlcnksIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCApO1xuIl19
}(jQuery));
