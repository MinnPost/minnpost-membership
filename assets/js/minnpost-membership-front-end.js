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
      var _this = this;

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

      document.querySelectorAll(".m-form-membership").forEach(function (membershipForm) {
        return membershipForm.addEventListener("submit", function (event) {
          _this.onFormSubmit(event);
        });
      });
    },
    // end init

    /*
     * run an analytics product action
    */
    analyticsProductAction: function analyticsProductAction(level, amount, frequency_label, action, step) {
      var product = this.analyticsProduct(level, amount, frequency_label);
      wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', action, product, step);
    },
    // end analyticsProductAction

    /*
      * create an analytics product variable
     */
    analyticsProduct: function analyticsProduct(level, amount, frequency_label) {
      var product = {
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
    onFrequencyChange: function onFrequencyChange(event) {
      this.setAmountLabels($(event.target).val());
      this.setMinAmounts($(event.target).val());
      this.checkAndSetLevel(true);
    },
    // end onFrequencyChange
    onSuggestedAmountChange: function onSuggestedAmountChange(event) {
      $(this.element).find(this.options.amountField).val(null);
      this.checkAndSetLevel(true);
    },
    // end onSuggestedAmountChange
    onAmountChange: function onAmountChange(event) {
      this.clearAmountSelector(event);
      var $target = $(event.target);

      if ($target.data('last-value') != $target.val()) {
        $target.data('last-value', $target.val());
        this.checkAndSetLevel(true);
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
    onFormSubmit: function onFormSubmit(event) {
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
    checkAndSetLevel: function checkAndSetLevel(updated) {
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

    $('.a-refresh-page').on('click', function (event) {
      event.preventDefault();
      location.reload();
    });
  });
})(jQuery);
"use strict";

var button = document.querySelector('.m-support-cta-top .a-support-button');

if (button) {
  button.addEventListener('click', function (event) {
    var value = '';
    var svg = button.querySelector('svg');

    if (null !== svg) {
      var attribute = svg.getAttribute('title');

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsIm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCIkIiwiZG9jdW1lbnQiLCJwbHVnaW5OYW1lIiwiZGVmYXVsdHMiLCJmcmVxdWVuY3lTZWxlY3RvciIsImFtb3VudEdyb3VwIiwiYW1vdW50U2VsZWN0b3IiLCJhbW91bnRMYWJlbHMiLCJhbW91bnRWYWx1ZSIsImFtb3VudERlc2NyaXB0aW9uIiwiYW1vdW50RmllbGQiLCJjdXN0b21BbW91bnRGcmVxdWVuY3kiLCJsZXZlbFZpZXdlciIsImxldmVsTmFtZSIsInVzZXJDdXJyZW50TGV2ZWwiLCJkZWNsaW5lQmVuZWZpdHMiLCJnaWZ0U2VsZWN0aW9uR3JvdXAiLCJzd2FnRWxpZ2liaWxpdHlUZXh0Iiwic3dhZ1NlbGVjdG9yIiwic3dhZ0xhYmVscyIsInN1YnNjcmlwdGlvbnNTZWxlY3RvciIsInN1YnNjcmlwdGlvbnNMYWJlbHMiLCJtaW5BbW91bnRzIiwiZGVjbGluZVN1YnNjcmlwdGlvbnMiLCJQbHVnaW4iLCJlbGVtZW50Iiwib3B0aW9ucyIsImV4dGVuZCIsIl9kZWZhdWx0cyIsIl9uYW1lIiwiaW5pdCIsIiRmcmVxdWVuY3kiLCJmaW5kIiwiJGZvcm0iLCIkc3VnZ2VzdGVkQW1vdW50IiwiJGFtb3VudCIsIiRkZWNsaW5lQmVuZWZpdHMiLCIkc3Vic2NyaXB0aW9ucyIsImxlbmd0aCIsInNldEFtb3VudExhYmVscyIsImZpbHRlciIsInZhbCIsInNldE1pbkFtb3VudHMiLCJjaGVja0FuZFNldExldmVsIiwib24iLCJvbkZyZXF1ZW5jeUNoYW5nZSIsImJpbmQiLCJvblN1Z2dlc3RlZEFtb3VudENoYW5nZSIsIm9uQW1vdW50Q2hhbmdlIiwibm90IiwiaXMiLCJwcm9wIiwib25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UiLCJvblN1YnNjcmlwdGlvbnNDbGljayIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJmb3JFYWNoIiwibWVtYmVyc2hpcEZvcm0iLCJhZGRFdmVudExpc3RlbmVyIiwiZXZlbnQiLCJvbkZvcm1TdWJtaXQiLCJhbmFseXRpY3NQcm9kdWN0QWN0aW9uIiwiZnJlcXVlbmN5X2xhYmVsIiwiYWN0aW9uIiwic3RlcCIsInByb2R1Y3QiLCJhbmFseXRpY3NQcm9kdWN0Iiwid3AiLCJob29rcyIsImRvQWN0aW9uIiwidG9Mb3dlckNhc2UiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwidGFyZ2V0IiwiY2xlYXJBbW91bnRTZWxlY3RvciIsIiR0YXJnZXQiLCIkZ2lmdFNlbGVjdGlvbkdyb3VwIiwiZGVjbGluZSIsImhpZGUiLCJzaG93IiwiJGRlY2xpbmUiLCJmcmVxdWVuY3lfc3RyaW5nIiwic3BsaXQiLCJmcmVxdWVuY3lfbmFtZSIsImZyZXF1ZW5jeV9pZCIsInRleHQiLCJjYXRlZ29yeSIsImxhYmVsIiwibG9jYXRpb24iLCJwYXRobmFtZSIsImhhc0NsYXNzIiwiY2xhc3NMaXN0IiwiY29udGFpbnMiLCJmcmVxdWVuY3lTdHJpbmciLCIkZ3JvdXBzIiwiJHNlbGVjdGVkIiwiaW5kZXgiLCIkY3VzdG9tQW1vdW50RnJlcXVlbmN5IiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImN1cnJlbnRGcmVxdWVuY3lMYWJlbCIsImZpcnN0IiwiJGVsZW1lbnRzIiwidXBkYXRlZCIsInNob3dOZXdMZXZlbCIsInNldEVuYWJsZWRHaWZ0cyIsIm1lbWJlcl9sZXZlbF9wcmVmaXgiLCJvbGRfbGV2ZWwiLCJsZXZlbFZpZXdlckNvbnRhaW5lciIsImRlY29kZUh0bWxFbnRpdHkiLCJzdHIiLCJyZXBsYWNlIiwibWF0Y2giLCJkZWMiLCJTdHJpbmciLCJmcm9tQ2hhckNvZGUiLCJtZW1iZXJfbGV2ZWwiLCJodG1sIiwic2V0RW5hYmxlZCIsInllYXJseUFtb3VudCIsImVhY2giLCJmbiIsImpRdWVyeSIsImJlbmVmaXRGb3JtIiwicGVyZm9ybWFuY2UiLCJuYXZpZ2F0aW9uIiwicmVsb2FkIiwicmVtb3ZlQXR0ciIsImNsaWNrIiwicHJldmVudERlZmF1bHQiLCIkYnV0dG9uIiwiJHN0YXR1cyIsInBhcmVudCIsIiRzZWxlY3QiLCJiZW5lZml0VHlwZSIsInBvc3QiLCJhamF4dXJsIiwicmVzcG9uc2UiLCJzdWNjZXNzIiwiYnV0dG9uX3ZhbHVlIiwiYnV0dG9uX2xhYmVsIiwiYnV0dG9uX2NsYXNzIiwiYnV0dG9uX2F0dHIiLCJtZXNzYWdlIiwibWVzc2FnZV9jbGFzcyIsImF0dHIiLCJyZW1vdmVfaW5zdGFuY2VfdmFsdWUiLCJpIiwicmVtb3ZlIiwicmVhZHkiLCJidXR0b24iLCJxdWVyeVNlbGVjdG9yIiwidmFsdWUiLCJzdmciLCJhdHRyaWJ1dGUiLCJnZXRBdHRyaWJ1dGUiLCJ0ZXh0Q29udGVudCIsInVuZGVmaW5lZCIsInJlc2V0IiwiY2F0Y2hIYXNoTGlua3MiLCJsZXZlbEZsaXBwZXIiLCJzdGFydExldmVsQ2xpY2siLCJlIiwiaG9zdG5hbWUiLCJoYXNoIiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsIm9mZnNldCIsInRvcCIsInRoYXQiLCJsZXZlbF9udW1iZXIiLCJsZXZlbHNfY29udGFpbmVyIiwic2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IiLCJmbGlwcGVkX2l0ZW1zIiwid3JhcEFsbCIsImZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJzaW5nbGVfbGV2ZWxfY29udGFpbmVyIiwiY2xvc2VzdCIsImFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJhbW91bnRfdmlld2VyIiwiY2hhbmdlRnJlcXVlbmN5IiwibGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IiLCJjaGFuZ2VBbW91bnRQcmV2aWV3IiwiY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMiLCJzZWxlY3RlZCIsInJhbmdlIiwibW9udGhfdmFsdWUiLCJ5ZWFyX3ZhbHVlIiwib25jZV92YWx1ZSIsImxldmVsX2NsYXNzIl0sIm1hcHBpbmdzIjoiOztBQUFBOztBQUFDLENBQUMsVUFBV0EsTUFBWCxFQUFvQjtBQUNyQixXQUFTQyxrQkFBVCxDQUE2QkMsSUFBN0IsRUFBbUNDLFFBQW5DLEVBQThDO0FBQzdDLFNBQUtELElBQUwsR0FBWSxFQUFaOztBQUNBLFFBQUksT0FBT0EsSUFBUCxLQUFnQixXQUFwQixFQUFpQztBQUNoQyxXQUFLQSxJQUFMLEdBQVlBLElBQVo7QUFDQTs7QUFFRCxTQUFLQyxRQUFMLEdBQWdCLEVBQWhCOztBQUNBLFFBQUksT0FBT0EsUUFBUCxLQUFvQixXQUF4QixFQUFxQztBQUNwQyxXQUFLQSxRQUFMLEdBQWdCQSxRQUFoQjtBQUNBOztBQUVELFNBQUtDLGNBQUwsR0FBc0IsRUFBdEI7O0FBQ0EsUUFBSyxPQUFPLEtBQUtGLElBQUwsQ0FBVUcsWUFBakIsS0FBa0MsV0FBbEMsSUFDQSxPQUFPLEtBQUtILElBQUwsQ0FBVUcsWUFBVixDQUF1QkMsZUFBOUIsS0FBa0QsV0FEdkQsRUFDcUU7QUFDcEUsV0FBS0YsY0FBTCxHQUFzQixLQUFLRixJQUFMLENBQVVHLFlBQVYsQ0FBdUJDLGVBQTdDO0FBQ0E7QUFDRDs7QUFFREwsRUFBQUEsa0JBQWtCLENBQUNNLFNB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QUUwQixPQUFPLENBQUNzSixzQkFBVixFQUFrQ3ZKLE9BQWxDLENBQUQsQ0FBNEN5RSxXQUE1QyxDQUF5RCxRQUF6RDtBQUNBbEcsUUFBQUEsQ0FBQyxDQUFFMEIsT0FBTyxDQUFDc0osc0JBQVIsR0FBaUMsR0FBakMsR0FBdUNOLFlBQXpDLEVBQXVEakosT0FBdkQsQ0FBRCxDQUFrRTBFLFFBQWxFLENBQTRFLFFBQTVFO0FBQ0FuRyxRQUFBQSxDQUFDLENBQUUwQixPQUFPLENBQUNzSixzQkFBUixHQUFpQyxHQUFqQyxHQUF1Q04sWUFBdkMsR0FBc0QsR0FBdEQsR0FBNERoSixPQUFPLENBQUNrSiw2QkFBdEUsQ0FBRCxDQUF1R3pFLFFBQXZHLENBQWlILFNBQWpIO0FBQ0EsT0FQRDtBQVFBLEtBMUtpQixDQTBLZjs7QUExS2UsR0FBbkIsQ0FuQ2lFLENBK005RDtBQUVIO0FBQ0E7O0FBQ0FuRyxFQUFBQSxDQUFDLENBQUN5SCxFQUFGLENBQUt2SCxVQUFMLElBQW1CLFVBQVd3QixPQUFYLEVBQXFCO0FBQ3ZDLFdBQU8sS0FBSzhGLElBQUwsQ0FBVSxZQUFZO0FBQzVCLFVBQUssQ0FBRXhILENBQUMsQ0FBQ3ZCLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXlCLFVBQTFCLENBQVAsRUFBZ0Q7QUFDL0NGLFFBQUFBLENBQUMsQ0FBQ3ZCLElBQUYsQ0FBUSxJQUFSLEVBQWMsWUFBWXlCLFVBQTFCLEVBQXNDLElBQUlzQixNQUFKLENBQVksSUFBWixFQUFrQkUsT0FBbEIsQ0FBdEM7QUFDQTtBQUNELEtBSk0sQ0FBUDtBQUtBLEdBTkQ7QUFRQSxDQTNOQSxFQTJOR2dHLE1BM05ILEVBMk5XbkosTUEzTlgsRUEyTm1CMEIsUUEzTm5CLEVBMk42QnpCLGtCQTNON0IiLCJmaWxlIjoibWlubnBvc3QtbWVtYmVyc2hpcC1mcm9udC1lbmQuanMiLCJzb3VyY2VzQ29udGVudCI6WyI7KGZ1bmN0aW9uICggd2luZG93ICkge1xuXHRmdW5jdGlvbiBNaW5uUG9zdE1lbWJlcnNoaXAoIGRhdGEsIHNldHRpbmdzICkge1xuXHRcdHRoaXMuZGF0YSA9IHt9O1xuXHRcdGlmICh0eXBlb2YgZGF0YSAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRoaXMuZGF0YSA9IGRhdGE7XG5cdFx0fVxuXG5cdFx0dGhpcy5zZXR0aW5ncyA9IHt9O1xuXHRcdGlmICh0eXBlb2Ygc2V0dGluZ3MgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XG5cdFx0fVxuXG5cdFx0dGhpcy5wcmV2aW91c0Ftb3VudCA9ICcnO1xuXHRcdGlmICggdHlwZW9mIHRoaXMuZGF0YS5jdXJyZW50X3VzZXIgIT09ICd1bmRlZmluZWQnICYmXG5cdFx0ICAgICB0eXBlb2YgdGhpcy5kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0dGhpcy5wcmV2aW91c0Ftb3VudCA9IHRoaXMuZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50O1xuXHRcdH1cblx0fVxuXG5cdE1pbm5Qb3N0TWVtYmVyc2hpcC5wcm90b3R5cGUgPSB7XG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlICkge1xuXHRcdFx0dmFyIHRoaXN5ZWFyID0gcGFyc2VJbnQoIGFtb3VudCApICogcGFyc2VJbnQoIGZyZXF1ZW5jeSApO1xuXHRcdFx0aWYgKCB0eXBlb2YgdGhpcy5wcmV2aW91c0Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgJiYgdGhpcy5wcmV2aW91c0Ftb3VudCAhPT0gJycgKSB7XG5cdFx0XHRcdHZhciBwcmlvcl95ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCB0aGlzLnByZXZpb3VzQW1vdW50LnByaW9yX3llYXJfY29udHJpYnV0aW9ucywgMTAgKTtcblx0XHRcdFx0dmFyIGNvbWluZ195ZWFyX2Ftb3VudCA9IHBhcnNlSW50KCB0aGlzLnByZXZpb3VzQW1vdW50LmNvbWluZ195ZWFyX2NvbnRyaWJ1dGlvbnMsIDEwICk7XG5cdFx0XHRcdHZhciBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCA9IHBhcnNlSW50KCB0aGlzLnByZXZpb3VzQW1vdW50LmFubnVhbF9yZWN1cnJpbmdfYW1vdW50LCAxMCApO1xuXHRcdFx0XHQvLyBjYWxjdWxhdGUgbWVtYmVyIGxldmVsIGZvcm11bGFcblx0XHRcdFx0aWYgKCB0eXBlID09PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHByaW9yX3llYXJfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICs9IHRoaXN5ZWFyO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dGhpc3llYXIgPSBNYXRoLm1heCggcHJpb3JfeWVhcl9hbW91bnQsIGNvbWluZ195ZWFyX2Ftb3VudCwgYW5udWFsX3JlY3VycmluZ19hbW91bnQgKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0TGV2ZWwoIHRoaXN5ZWFyICk7XG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGdldExldmVsOiBmdW5jdGlvbiggdGhpc3llYXIgKSB7XG5cdFx0XHR2YXIgbGV2ZWwgPSB7XG5cdFx0XHRcdCd5ZWFybHlBbW91bnQnOiB0aGlzeWVhclxuXHRcdFx0fTtcblx0XHRcdGlmICggdGhpc3llYXIgPiAwICYmIHRoaXN5ZWFyIDwgNjAgKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnQnJvbnplJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMTtcblx0XHRcdH1cblx0XHRcdGVsc2UgaWYgKHRoaXN5ZWFyID4gNTkgJiYgdGhpc3llYXIgPCAxMjApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdTaWx2ZXInO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAyO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDExOSAmJiB0aGlzeWVhciA8IDI0MCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0dvbGQnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAzO1xuXHRcdFx0fSBlbHNlIGlmICh0aGlzeWVhciA+IDIzOSkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1BsYXRpbnVtJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gNDtcblx0XHRcdH1cblx0XHRcdHJldHVybiBsZXZlbDtcblx0XHR9LCAvLyBlbmQgZ2V0TGV2ZWxcblx0fTtcblxuXHR3aW5kb3cuTWlublBvc3RNZW1iZXJzaGlwID0gbmV3IE1pbm5Qb3N0TWVtYmVyc2hpcChcblx0XHR3aW5kb3cubWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLFxuXHRcdHdpbmRvdy5taW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzXG5cdCk7XG59KSggd2luZG93ICk7XG4iLCIvLyBwbHVnaW5cbjsoZnVuY3Rpb24gKCAkLCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXAgKSB7XG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdEFtb3VudFNlbGVjdCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdGZyZXF1ZW5jeVNlbGVjdG9yOiAnLm0tZnJlcXVlbmN5LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGFtb3VudEdyb3VwOiAnLm0tZnJlcXVlbmN5LWdyb3VwJyxcblx0XHRhbW91bnRTZWxlY3RvcjogJy5tLWFtb3VudC1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRhbW91bnRMYWJlbHM6ICcubS1hbW91bnQtc2VsZWN0IGxhYmVsJyxcblx0XHRhbW91bnRWYWx1ZTogJ3N0cm9uZycsXG5cdFx0YW1vdW50RGVzY3JpcHRpb246ICcuYS1hbW91bnQtZGVzY3JpcHRpb24nLFxuXHRcdGFtb3VudEZpZWxkOiAnLmEtYW1vdW50LWZpZWxkICNhbW91bnQnLFxuXHRcdGN1c3RvbUFtb3VudEZyZXF1ZW5jeTogJyNhbW91bnQtaXRlbSAuYS1mcmVxdWVuY3ktdGV4dC1sYWJlbCcsXG5cdFx0bGV2ZWxWaWV3ZXI6ICcuYS1zaG93LWxldmVsJyxcblx0XHRsZXZlbE5hbWU6ICcuYS1sZXZlbCcsXG5cdFx0dXNlckN1cnJlbnRMZXZlbDogJy5hLWN1cnJlbnQtbGV2ZWwnLFxuXHRcdGRlY2xpbmVCZW5lZml0czogJy5tLWRlY2xpbmUtYmVuZWZpdHMtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0Z2lmdFNlbGVjdGlvbkdyb3VwOiAnLm0tbWVtYmVyc2hpcC1naWZ0LXNlbGVjdG9yJyxcblx0XHRzd2FnRWxpZ2liaWxpdHlUZXh0OiAnLm0tbWVtYmVyc2hpcC1naWZ0LXNlbGVjdG9yIC5zd2FnLWVsaWdpYmlsaXR5Jyxcblx0XHRzd2FnU2VsZWN0b3I6ICcubS1zZWxlY3Qtc3dhZyBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdHN3YWdMYWJlbHM6ICcubS1zZWxlY3Qtc3dhZyBpbnB1dFt0eXBlPVwicmFkaW9cIl0gKyBsYWJlbCcsXG5cdFx0c3Vic2NyaXB0aW9uc1NlbGVjdG9yOiAnLm0tc2VsZWN0LXN1YnNjcmlwdGlvbiBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdHN1YnNjcmlwdGlvbnNMYWJlbHM6ICcubS1zZWxlY3Qtc3Vic2NyaXB0aW9uIGlucHV0W3R5cGU9XCJyYWRpb1wiXSArIGxhYmVsJyxcblx0XHRtaW5BbW91bnRzOiAnLm0tbWVtYmVyc2hpcC1naWZ0LXNlbGVjdG9yIC5taW4tYW1vdW50Jyxcblx0XHRkZWNsaW5lU3Vic2NyaXB0aW9uczogJyNzdWJzY3JpcHRpb24tZGVjbGluZSdcblx0fTtcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXHRcdGluaXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyICRmcmVxdWVuY3kgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKTtcblx0XHRcdHZhciAkZm9ybSA9ICQoIHRoaXMuZWxlbWVudCApO1xuXHRcdFx0dmFyICRzdWdnZXN0ZWRBbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKTtcblx0XHRcdHZhciAkYW1vdW50ID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICk7XG5cdFx0XHR2YXIgJGRlY2xpbmVCZW5lZml0cyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lQmVuZWZpdHMgKTtcblx0XHRcdHZhciAkc3Vic2NyaXB0aW9ucyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5zdWJzY3JpcHRpb25zU2VsZWN0b3IgKTtcblx0XHRcdGlmICggISggJGFtb3VudC5sZW5ndGggPiAwICYmXG5cdFx0XHQgICAgICAgICRmcmVxdWVuY3kubGVuZ3RoID4gMCAmJlxuXHRcdFx0ICAgICAgICAkc3VnZ2VzdGVkQW1vdW50Lmxlbmd0aCA+IDAgKSApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTZXQgdXAgdGhlIFVJIGZvciB0aGUgY3VycmVudCBmaWVsZCBzdGF0ZSBvbiAocmUtKWxvYWRcblx0XHRcdHRoaXMuc2V0QW1vdW50TGFiZWxzKCAkZnJlcXVlbmN5LmZpbHRlcignOmNoZWNrZWQnKS52YWwoKSApO1xuXHRcdFx0dGhpcy5zZXRNaW5BbW91bnRzKCAkZnJlcXVlbmN5LmZpbHRlcignOmNoZWNrZWQnKS52YWwoKSApO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCBmYWxzZSApO1xuXG5cdFx0XHQkZnJlcXVlbmN5Lm9uKCAnY2hhbmdlJywgdGhpcy5vbkZyZXF1ZW5jeUNoYW5nZS5iaW5kKHRoaXMpICk7XG5cdFx0XHQkc3VnZ2VzdGVkQW1vdW50Lm9uKCAnY2hhbmdlJywgdGhpcy5vblN1Z2dlc3RlZEFtb3VudENoYW5nZS5iaW5kKHRoaXMpICk7XG5cdFx0XHQkYW1vdW50Lm9uKCAna2V5dXAgbW91c2V1cCcsIHRoaXMub25BbW91bnRDaGFuZ2UuYmluZCh0aGlzKSApO1xuXG5cdFx0XHRpZiAoICEgKCAkZGVjbGluZUJlbmVmaXRzLmxlbmd0aCA+IDAgJiYgJHN1YnNjcmlwdGlvbnMubGVuZ3RoID4gMCApICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNldCB1cCB0aGUgVUkgZm9yIHRoZSBjdXJyZW50IGZpZWxkIHN0YXRlIG9uIChyZS0pbG9hZFxuXHRcdFx0aWYgKCAkc3Vic2NyaXB0aW9ucy5ub3QoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHRcdCQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHRcdH1cblx0XHRcdHRoaXMub25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UoKTtcblxuXHRcdFx0JGRlY2xpbmVCZW5lZml0cy5vbiggJ2NoYW5nZScsIHRoaXMub25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UuYmluZCggdGhpcyApICk7XG5cdFx0XHQkc3Vic2NyaXB0aW9ucy5vbiggJ2NsaWNrJywgdGhpcy5vblN1YnNjcmlwdGlvbnNDbGljay5iaW5kKCB0aGlzICkgKTtcblxuXHRcdFx0Ly8gd2hlbiB0aGUgZm9ybSBpcyBzdWJtaXR0ZWRcblx0XHRcdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoIFwiLm0tZm9ybS1tZW1iZXJzaGlwXCIgKS5mb3JFYWNoKFxuXHRcdFx0XHRtZW1iZXJzaGlwRm9ybSA9PiBtZW1iZXJzaGlwRm9ybS5hZGRFdmVudExpc3RlbmVyKCBcInN1Ym1pdFwiLCAoIGV2ZW50ICkgPT4ge1xuXHRcdFx0XHRcdHRoaXMub25Gb3JtU3VibWl0KCBldmVudCApO1xuXHRcdFx0XHR9IClcblx0XHRcdCk7XG5cblx0XHR9LCAvLyBlbmQgaW5pdFxuXG5cdFx0IC8qXG5cdFx0ICAqIHJ1biBhbiBhbmFseXRpY3MgcHJvZHVjdCBhY3Rpb25cblx0XHQgKi9cblx0XHQgYW5hbHl0aWNzUHJvZHVjdEFjdGlvbjogZnVuY3Rpb24oIGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCwgYWN0aW9uLCBzdGVwICkge1xuXHRcdFx0dmFyIHByb2R1Y3QgPSB0aGlzLmFuYWx5dGljc1Byb2R1Y3QobGV2ZWwsIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsICk7XG5cdFx0XHR3cC5ob29rcy5kb0FjdGlvbiggJ21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0Vjb21tZXJjZUFjdGlvbicsICdldmVudCcsIGFjdGlvbiwgcHJvZHVjdCwgc3RlcCApO1xuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NQcm9kdWN0QWN0aW9uXG5cblx0XHQvKlxuXHRcdCAgKiBjcmVhdGUgYW4gYW5hbHl0aWNzIHByb2R1Y3QgdmFyaWFibGVcblx0XHQgKi9cblx0XHRhbmFseXRpY3NQcm9kdWN0OiBmdW5jdGlvbiggbGV2ZWwsIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsICkge1xuXHRcdFx0bGV0IHByb2R1Y3QgPSB7XG5cdFx0XHRcdCdpZCc6ICdtaW5ucG9zdF8nICsgbGV2ZWwudG9Mb3dlckNhc2UoKSArICdfbWVtYmVyc2hpcCcsXG5cdFx0XHRcdCduYW1lJzogJ01pbm5Qb3N0ICcgKyBsZXZlbC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGxldmVsLnNsaWNlKDEpICsgJyBNZW1iZXJzaGlwJyxcblx0XHRcdFx0J2NhdGVnb3J5JzogJ0RvbmF0aW9uJyxcblx0XHRcdFx0J2JyYW5kJzogJ01pbm5Qb3N0Jyxcblx0XHRcdFx0J3ZhcmlhbnQnOiAgZnJlcXVlbmN5X2xhYmVsLFxuXHRcdFx0XHQncHJpY2UnOiBhbW91bnQsXG5cdFx0XHRcdCdxdWFudGl0eSc6IDFcblx0XHRcdH1cblx0XHRcdHJldHVybiBwcm9kdWN0O1xuXHRcdH0sIC8vIGVuZCBhbmFseXRpY3NQcm9kdWN0XG5cblx0XHRvbkZyZXF1ZW5jeUNoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoICQoIGV2ZW50LnRhcmdldCApLnZhbCgpICk7XG5cdFx0XHR0aGlzLnNldE1pbkFtb3VudHMoICQoIGV2ZW50LnRhcmdldCApLnZhbCgpICk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoIHRydWUgKTtcblx0XHR9LCAvLyBlbmQgb25GcmVxdWVuY3lDaGFuZ2VcblxuXHRcdG9uU3VnZ2VzdGVkQW1vdW50Q2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHQkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQgKS52YWwoIG51bGwgKTtcblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCggdHJ1ZSk7XG5cdFx0fSwgLy8gZW5kIG9uU3VnZ2VzdGVkQW1vdW50Q2hhbmdlXG5cblx0XHRvbkFtb3VudENoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dGhpcy5jbGVhckFtb3VudFNlbGVjdG9yKCBldmVudCApO1xuXG5cdFx0XHR2YXIgJHRhcmdldCA9ICQoIGV2ZW50LnRhcmdldCApO1xuXHRcdFx0aWYgKCAkdGFyZ2V0LmRhdGEoICdsYXN0LXZhbHVlJyApICE9ICR0YXJnZXQudmFsKCkgKSB7XG5cdFx0XHRcdCR0YXJnZXQuZGF0YSggJ2xhc3QtdmFsdWUnLCAkdGFyZ2V0LnZhbCgpICk7XG5cdFx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCggdHJ1ZSApO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBvbkFtb3VudENoYW5nZVxuXG5cdFx0b25EZWNsaW5lQmVuZWZpdHNDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciAkZ2lmdFNlbGVjdGlvbkdyb3VwID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmdpZnRTZWxlY3Rpb25Hcm91cCApO1xuXHRcdFx0dmFyIGRlY2xpbmUgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZGVjbGluZUJlbmVmaXRzICkuZmlsdGVyKCAnOmNoZWNrZWQnICkudmFsKCk7XG5cblx0XHRcdGlmICggZGVjbGluZSA9PT0gJ3RydWUnICkge1xuXHRcdFx0XHQkZ2lmdFNlbGVjdGlvbkdyb3VwLmhpZGUoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQkZ2lmdFNlbGVjdGlvbkdyb3VwLnNob3coKTtcblx0XHR9LCAvLyBlbmQgb25EZWNsaW5lQmVuZWZpdHNDaGFuZ2VcblxuXHRcdG9uU3Vic2NyaXB0aW9uc0NsaWNrOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgJHN1YnNjcmlwdGlvbnMgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuc3Vic2NyaXB0aW9uc1NlbGVjdG9yICkubm90KCB0aGlzLm9wdGlvbnMuZGVjbGluZVN1YnNjcmlwdGlvbnMgKTtcblx0XHRcdHZhciAkZGVjbGluZSA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApO1xuXG5cdFx0XHRpZiAoICQoIGV2ZW50LnRhcmdldCApLmlzKCB0aGlzLm9wdGlvbnMuZGVjbGluZVN1YnNjcmlwdGlvbnMgKSApIHtcblx0XHRcdFx0JHN1YnNjcmlwdGlvbnMucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRkZWNsaW5lLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHR9LCAvLyBlbmQgb25TdWJzY3JpcHRpb25zQ2hhbmdlXG5cblx0XHRvbkZvcm1TdWJtaXQ6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciBhbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKS5maWx0ZXIoICc6Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdGlmICggdHlwZW9mIGFtb3VudCA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCApLnZhbCgpO1xuXHRcdFx0fVxuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAkKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnICkudmFsKCk7XG5cdFx0XHR2YXIgZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdHZhciBmcmVxdWVuY3lfaWQgPSAkKCB0aGlzLm9wdGlvbnMuZnJlcXVlbmN5U2VsZWN0b3IgKyAnOmNoZWNrZWQnICkucHJvcCggJ2lkJyApO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9sYWJlbCA9ICQoICdsYWJlbFtmb3I9XCInICsgZnJlcXVlbmN5X2lkICsgJ1wiXScgKS50ZXh0KCk7XG5cdFx0XHR2YXIgbGV2ZWwgPSBNaW5uUG9zdE1lbWJlcnNoaXAuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lICk7XG5cblx0XHRcdHZhciBvcHRpb25zID0ge1xuXHRcdFx0XHR0eXBlOiAnZXZlbnQnLFxuXHRcdFx0XHRjYXRlZ29yeTogJ1N1cHBvcnQgVXMnLFxuXHRcdFx0XHRhY3Rpb246ICdCZWNvbWUgQSBNZW1iZXInLFxuXHRcdFx0XHRsYWJlbDogbG9jYXRpb24ucGF0aG5hbWVcblx0XHRcdH07XG5cdFx0XHQvLyB0aGlzIHRyYWNrcyBhbiBldmVudCBzdWJtaXNzaW9uIGJhc2VkIG9uIHRoZSBwbHVnaW4gb3B0aW9uc1xuXHRcdFx0Ly8gaXQgYWxzbyBidWJibGVzIHRoZSBldmVudCB1cCB0byBzdWJtaXQgdGhlIGZvcm1cblx0XHRcdHdwLmhvb2tzLmRvQWN0aW9uKFxuXHRcdFx0XHQnbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRXZlbnQnLFxuXHRcdFx0XHRvcHRpb25zLnR5cGUsXG5cdFx0XHRcdG9wdGlvbnMuY2F0ZWdvcnksXG5cdFx0XHRcdG9wdGlvbnMuYWN0aW9uLFxuXHRcdFx0XHRvcHRpb25zLmxhYmVsXG5cdFx0XHQpO1xuXHRcdFx0dmFyIGhhc0NsYXNzID0gZXZlbnQudGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucyggXCJtLWZvcm0tbWVtYmVyc2hpcC1zdXBwb3J0XCIgKTtcblx0XHRcdC8vIGlmIHRoaXMgaXMgdGhlIG1haW4gY2hlY2tvdXQgZm9ybSwgc2VuZCBpdCB0byB0aGUgZWMgcGx1Z2luIGFzIGEgY2hlY2tvdXRcblx0XHRcdGlmICggaGFzQ2xhc3MgKSB7XG5cdFx0XHRcdHZhciBwcm9kdWN0ID0gdGhpcy5hbmFseXRpY3NQcm9kdWN0KCBsZXZlbFsnbmFtZSddLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCApO1xuXHRcdFx0XHR3cC5ob29rcy5kb0FjdGlvbiggJ21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0Vjb21tZXJjZUFjdGlvbicsICdldmVudCcsICdhZGRfdG9fY2FydCcsIHByb2R1Y3QgKTtcblx0XHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oICdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFY29tbWVyY2VBY3Rpb24nLCAnZXZlbnQnLCAnYmVnaW5fY2hlY2tvdXQnLCBwcm9kdWN0ICk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIG9uRm9ybVN1Ym1pdFxuXG5cdFx0Y2xlYXJBbW91bnRTZWxlY3RvcjogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyICRzdWdnZXN0ZWRBbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKTtcblxuXHRcdFx0aWYgKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSA9PT0gJycgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JHN1Z2dlc3RlZEFtb3VudC5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0fSwgLy8gZW5kIGNsZWFyQW1vdW50U2VsZWN0b3JcblxuXHRcdHNldEFtb3VudExhYmVsczogZnVuY3Rpb24oIGZyZXF1ZW5jeVN0cmluZyApIHtcblx0XHRcdHZhciAkZ3JvdXBzID0gJCggdGhpcy5vcHRpb25zLmFtb3VudEdyb3VwICk7XG5cdFx0XHR2YXIgJHNlbGVjdGVkID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yIClcblx0XHRcdCAgICAuZmlsdGVyKCAnOmNoZWNrZWQnICk7XG5cdFx0XHR2YXIgaW5kZXggPSAkc2VsZWN0ZWQuZGF0YSggJ2luZGV4JyApO1xuXHRcdFx0dmFyICRjdXN0b21BbW91bnRGcmVxdWVuY3kgPSAkKCB0aGlzLm9wdGlvbnMuY3VzdG9tQW1vdW50RnJlcXVlbmN5ICk7XG5cblx0XHRcdCRncm91cHMucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQkZ3JvdXBzLmZpbHRlciggJ1tkYXRhLWZyZXF1ZW5jeT1cIicgKyBmcmVxdWVuY3lTdHJpbmcgKyAnXCJdJyApXG5cdFx0XHRcdC5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCRzZWxlY3RlZC5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0XHQkZ3JvdXBzLmZpbHRlciggJy5hY3RpdmUnIClcblx0XHRcdFx0LmZpbmQoICdpbnB1dFt0eXBlPVwicmFkaW9cIl1bZGF0YS1pbmRleD1cIicgKyBpbmRleCArICdcIl0nIClcblx0XHRcdFx0LnByb3AoICdjaGVja2VkJywgdHJ1ZSApO1xuXG5cdFx0XHR2YXIgY3VycmVudEZyZXF1ZW5jeUxhYmVsID0gJGdyb3Vwcy5maWx0ZXIoICcuYWN0aXZlJyApLmZpbmQoJy5hLWZyZXF1ZW5jeS10ZXh0LWxhYmVsJykuZmlyc3QoKS50ZXh0KCk7XG5cdFx0XHQkY3VzdG9tQW1vdW50RnJlcXVlbmN5LnRleHQoIGN1cnJlbnRGcmVxdWVuY3lMYWJlbCApO1xuXHRcdH0sIC8vIGVuZCBzZXRBbW91bnRMYWJlbHNcblxuXHRcdHNldE1pbkFtb3VudHM6IGZ1bmN0aW9uKCBmcmVxdWVuY3lTdHJpbmcgKSB7XG5cdFx0XHR2YXIgJGVsZW1lbnRzID0gJCggdGhpcy5vcHRpb25zLm1pbkFtb3VudHMgKTtcblx0XHRcdCRlbGVtZW50cy5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdCRlbGVtZW50cy5maWx0ZXIoICdbZGF0YS1mcmVxdWVuY3k9XCInICsgZnJlcXVlbmN5U3RyaW5nICsgJ1wiXScgKVxuXHRcdFx0XHQuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0fSwgLy8gZW5kIHNldE1pbkFtb3VudHNcblxuXHRcdGNoZWNrQW5kU2V0TGV2ZWw6IGZ1bmN0aW9uKCB1cGRhdGVkICkge1xuXHRcdFx0dmFyIGFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApLmZpbHRlciggJzpjaGVja2VkJyApLnZhbCgpO1xuXHRcdFx0aWYgKCB0eXBlb2YgYW1vdW50ID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0YW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICkudmFsKCk7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBmcmVxdWVuY3lfc3RyaW5nID0gJCggdGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICsgJzpjaGVja2VkJyApLnZhbCgpO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHR2YXIgZnJlcXVlbmN5X2lkID0gJCggdGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICsgJzpjaGVja2VkJyApLnByb3AoICdpZCcgKTtcblx0XHRcdHZhciBmcmVxdWVuY3lfbGFiZWwgPSAkKCAnbGFiZWxbZm9yPVwiJyArIGZyZXF1ZW5jeV9pZCArICdcIl0nICkudGV4dCgpO1xuXG5cdFx0XHR2YXIgbGV2ZWwgPSBNaW5uUG9zdE1lbWJlcnNoaXAuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lICk7XG5cdFx0XHR0aGlzLnNob3dOZXdMZXZlbCggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMsIGxldmVsICk7XG5cdFx0XHR0aGlzLnNldEVuYWJsZWRHaWZ0cyggbGV2ZWwgKTtcblx0XHRcdHRoaXMuYW5hbHl0aWNzUHJvZHVjdEFjdGlvbiggbGV2ZWxbJ25hbWUnXSwgYW1vdW50LCBmcmVxdWVuY3lfbGFiZWwsICdzZWxlY3RfY29udGVudCcsIDEgKTtcblx0XHR9LCAvLyBlbmQgY2hlY2tBbmRTZXRMZXZlbFxuXG5cdFx0c2hvd05ld0xldmVsOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucywgbGV2ZWwgKSB7XG5cdFx0XHR2YXIgbWVtYmVyX2xldmVsX3ByZWZpeCA9ICcnO1xuXHRcdFx0dmFyIG9sZF9sZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsVmlld2VyQ29udGFpbmVyID0gb3B0aW9ucy5sZXZlbFZpZXdlcjsgLy8gdGhpcyBzaG91bGQgY2hhbmdlIHdoZW4gd2UgcmVwbGFjZSB0aGUgdGV4dCwgaWYgdGhlcmUgaXMgYSBsaW5rIGluc2lkZSBpdFxuXHRcdFx0dmFyIGRlY29kZUh0bWxFbnRpdHkgPSBmdW5jdGlvbiggc3RyICkge1xuXHRcdFx0XHRyZXR1cm4gc3RyLnJlcGxhY2UoIC8mIyhcXGQrKTsvZywgZnVuY3Rpb24oIG1hdGNoLCBkZWMgKSB7XG5cdFx0XHRcdFx0cmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoIGRlYyApO1xuXHRcdFx0XHR9KTtcblx0XHRcdH07XG5cdFx0XHRpZiAoIHR5cGVvZiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEgIT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRtZW1iZXJfbGV2ZWxfcHJlZml4ID0gbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhLm1lbWJlcl9sZXZlbF9wcmVmaXg7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0JChvcHRpb25zLmxldmVsVmlld2VyKS5wcm9wKCAnY2xhc3MnLCAnYS1zaG93LWxldmVsIGEtc2hvdy1sZXZlbC0nICsgbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICk7XG5cblx0XHRcdFx0aWYgKCAkKCBvcHRpb25zLnVzZXJDdXJyZW50TGV2ZWwgKS5sZW5ndGggPiAwICYmIG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLmxlbmd0aCA+IDAgKSB7XG5cblx0XHRcdFx0XHRpZiAoICdhJywgJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHRsZXZlbFZpZXdlckNvbnRhaW5lciA9IG9wdGlvbnMubGV2ZWxWaWV3ZXIgKyAnIGEnO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG9sZF9sZXZlbCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5jdXJyZW50X3VzZXIubWVtYmVyX2xldmVsLnJlcGxhY2UoIG1lbWJlcl9sZXZlbF9wcmVmaXgsICcnICk7XG5cblx0XHRcdFx0XHRpZiAoIG9sZF9sZXZlbCAhPT0gbGV2ZWxbJ25hbWUnXS50b0xvd2VyQ2FzZSgpICkge1xuXHRcdFx0XHRcdFx0JCggbGV2ZWxWaWV3ZXJDb250YWluZXIgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsVmlld2VyICkuZGF0YSggJ2NoYW5nZWQnICkgKSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCBsZXZlbFZpZXdlckNvbnRhaW5lciApLmh0bWwoIGRlY29kZUh0bWxFbnRpdHkoICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5kYXRhKCAnbm90LWNoYW5nZWQnICkgKSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbE5hbWUsIG9wdGlvbnMubGV2ZWxWaWV3ZXIpLnRleHQoIGxldmVsWyduYW1lJ10gKTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgc2hvd05ld0xldmVsXG5cblx0XHRzZXRFbmFibGVkR2lmdHM6IGZ1bmN0aW9uKCBsZXZlbCApIHtcblx0XHRcdHZhciBzZXRFbmFibGVkID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5wcm9wKCAnZGlzYWJsZWQnLCBsZXZlbC55ZWFybHlBbW91bnQgPCAkKCB0aGlzICkuZGF0YSggJ21pblllYXJseUFtb3VudCcgKSApO1xuXHRcdFx0fTtcblxuXHRcdFx0JCggdGhpcy5vcHRpb25zLnN3YWdTZWxlY3RvciApLmVhY2goIHNldEVuYWJsZWQgKTtcblx0XHRcdCQoIHRoaXMub3B0aW9ucy5zdWJzY3JpcHRpb25zU2VsZWN0b3IgKS5lYWNoKCBzZXRFbmFibGVkICk7XG5cblx0XHRcdGlmICggJCggdGhpcy5vcHRpb25zLnN3YWdTZWxlY3RvciApLm5vdCggJyNzd2FnLWRlY2xpbmUnICkuaXMoICc6ZW5hYmxlZCcgKSApIHtcblx0XHRcdFx0JCggJy5zd2FnLWRpc2FibGVkJyApLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHQkKCAnLnN3YWctZW5hYmxlZCcgKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoICcuc3dhZy1kaXNhYmxlZCcgKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0JCggJy5zd2FnLWVuYWJsZWQnICkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIHNldEVuYWJsZWRHaWZ0c1xuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXAgKTtcbiIsIiggZnVuY3Rpb24oICQgKSB7XG5cblx0ZnVuY3Rpb24gYmVuZWZpdEZvcm0oKSB7XG5cdFx0aWYgKCAyID09PSBwZXJmb3JtYW5jZS5uYXZpZ2F0aW9uLnR5cGUgKSB7XG5cdFx0XHRsb2NhdGlvbi5yZWxvYWQoIHRydWUgKTtcblx0XHR9XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uLmEtYnV0dG9uLWRpc2FibGVkJyApLnJlbW92ZUF0dHIoICdkaXNhYmxlZCcgKTtcblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR2YXIgJGJ1dHRvbiAgPSAkKCB0aGlzICk7XG5cdFx0XHR2YXIgJHN0YXR1cyAgPSAkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJywgJCggdGhpcyApLnBhcmVudCgpICk7XG5cdFx0XHR2YXIgJHNlbGVjdCAgPSAkKCAnc2VsZWN0JywgJCggdGhpcyApLnBhcmVudCgpICk7XG5cdFx0XHR2YXIgc2V0dGluZ3MgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzO1xuXHRcdFx0Ly8gcmVzZXQgdGhlIG1lc3NhZ2UgZm9yIGN1cnJlbnQgc3RhdHVzXG5cdFx0XHRpZiAoICEgJy5tLWJlbmVmaXQtbWVzc2FnZS1zdWNjZXNzJyApIHtcblx0XHRcdFx0JCggJy5tLWJlbmVmaXQtbWVzc2FnZScgKS5yZW1vdmVDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgbS1iZW5lZml0LW1lc3NhZ2UtZXJyb3IgbS1iZW5lZml0LW1lc3NhZ2UtaW5mbycgKTtcblx0XHRcdH1cblx0XHRcdC8vIHNldCBidXR0b24gdG8gcHJvY2Vzc2luZ1xuXHRcdFx0JGJ1dHRvbi50ZXh0KCAnUHJvY2Vzc2luZycgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXG5cdFx0XHQvLyBkaXNhYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLmFkZENsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cblx0XHRcdC8vIHNldCBhamF4IGRhdGFcblx0XHRcdHZhciBkYXRhID0ge307XG5cdFx0XHR2YXIgYmVuZWZpdFR5cGUgPSAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScgKS52YWwoKTtcblx0XHRcdGlmICggJ3BhcnRuZXItb2ZmZXJzJyA9PT0gYmVuZWZpdFR5cGUgKSB7XG5cdFx0XHRcdGRhdGEgPSB7XG5cdFx0XHRcdFx0J2FjdGlvbicgOiAnYmVuZWZpdF9mb3JtX3N1Ym1pdCcsXG5cdFx0XHRcdFx0J21pbm5wb3N0X21lbWJlcnNoaXBfYmVuZWZpdF9mb3JtX25vbmNlJyA6ICRidXR0b24uZGF0YSggJ2JlbmVmaXQtbm9uY2UnICksXG5cdFx0XHRcdFx0J2N1cnJlbnRfdXJsJyA6ICQoICdpbnB1dFtuYW1lPVwiY3VycmVudF91cmxcIl0nKS52YWwoKSxcblx0XHRcdFx0XHQnYmVuZWZpdC1uYW1lJzogJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nKS52YWwoKSxcblx0XHRcdFx0XHQnaW5zdGFuY2VfaWQnIDogJCggJ1tuYW1lPVwiaW5zdGFuY2UtaWQtJyArICRidXR0b24udmFsKCkgKyAnXCJdJyApLnZhbCgpLFxuXHRcdFx0XHRcdCdwb3N0X2lkJyA6ICRidXR0b24udmFsKCksXG5cdFx0XHRcdFx0J2lzX2FqYXgnIDogJzEnLFxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCQucG9zdCggc2V0dGluZ3MuYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRcdC8vIHN1Y2Nlc3Ncblx0XHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0XHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0XHQkc3RhdHVzLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmFkZENsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzICk7XG5cdFx0XHRcdFx0XHRpZiAoIDAgPCAkc2VsZWN0Lmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdFx0JHNlbGVjdC5wcm9wKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkubm90KCAkYnV0dG9uICkudmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLmF0dHIoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Ly8gZXJyb3Jcblx0XHRcdFx0XHRcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHRcdFx0aWYgKCAndW5kZWZpbmVkJyA9PT0gdHlwZW9mIHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRpZiAoICcnICE9PSByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLnNob3coKTtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uaGlkZSgpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHQkKCAnb3B0aW9uJywgJHNlbGVjdCApLmVhY2goIGZ1bmN0aW9uKCBpICkge1xuXHRcdFx0XHRcdFx0XHRcdGlmICggJCggdGhpcyApLnZhbCgpID09PSByZXNwb25zZS5kYXRhLnJlbW92ZV9pbnN0YW5jZV92YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0XHRcdCQoIHRoaXMgKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRpZiAoICcnICE9PSByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLnNob3coKTtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uaGlkZSgpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvLyByZS1lbmFibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHRcdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkubm90KCAkYnV0dG9uICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblx0XHRcdFx0XHRcdCRzdGF0dXMuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuYWRkQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3MgKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblx0XHRpZiAoIDAgPCAkKCAnLm0tZm9ybS1tZW1iZXJzaGlwLWJlbmVmaXQnICkubGVuZ3RoICkge1xuXHRcdFx0YmVuZWZpdEZvcm0oKTtcblx0XHR9XG5cdFx0JCggJy5hLXJlZnJlc2gtcGFnZScgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24gKCBldmVudCApIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRsb2NhdGlvbi5yZWxvYWQoKTtcblx0XHR9KTtcblx0fSk7XG5cbn0gKSggalF1ZXJ5ICk7XG4iLCJjb25zdCBidXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCAnLm0tc3VwcG9ydC1jdGEtdG9wIC5hLXN1cHBvcnQtYnV0dG9uJyApO1xuaWYgKCBidXR0b24gKSB7XG5cdGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCAnY2xpY2snLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0dmFyIHZhbHVlID0gJyc7XG5cdFx0Y29uc3Qgc3ZnID0gYnV0dG9uLnF1ZXJ5U2VsZWN0b3IoICdzdmcnICk7XG5cdFx0aWYgKCBudWxsICE9PSBzdmcgKSB7XG5cdFx0XHRsZXQgYXR0cmlidXRlID0gc3ZnLmdldEF0dHJpYnV0ZSggJ3RpdGxlJyApO1xuXHRcdFx0aWYgKCBudWxsICE9PSBhdHRyaWJ1dGUgKSB7XG5cdFx0XHRcdHZhbHVlID0gYXR0cmlidXRlICsgJyAnO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR2YWx1ZSA9IHZhbHVlICsgYnV0dG9uLnRleHRDb250ZW50O1xuXHRcdHdwLmhvb2tzLmRvQWN0aW9uKCdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFdmVudCcsICdldmVudCcsICdTdXBwb3J0IENUQSAtIEhlYWRlcicsICdDbGljazogJyArIHZhbHVlLCBsb2NhdGlvbi5wYXRobmFtZSk7XG5cdH0pO1xufVxuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwLCB1bmRlZmluZWQgKSB7XG5cblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0TWVtYmVyc2hpcCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdCdkZWJ1ZycgOiBmYWxzZSwgLy8gdGhpcyBjYW4gYmUgc2V0IHRvIHRydWUgb24gcGFnZSBsZXZlbCBvcHRpb25zXG5cdFx0J2Ftb3VudF92aWV3ZXInIDogJy5hbW91bnQgaDMnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYS1mb3JtLWl0ZW0tbWVtYmVyc2hpcC1mcmVxdWVuY3knLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzX3R5cGUnIDogJ3NlbGVjdCcsXG5cdFx0J2xldmVsc19jb250YWluZXInIDogJy5vLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVscycsXG5cdFx0J3NpbmdsZV9sZXZlbF9jb250YWluZXInIDogJy5tLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVsJyxcblx0XHQnc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3InIDogJy5tLW1lbWJlci1sZXZlbC1icmllZicsXG5cdFx0J2ZsaXBwZWRfaXRlbXMnIDogJ2Rpdi5hbW91bnQsIGRpdi5lbnRlcicsXG5cdFx0J2xldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yJyA6ICcuc2hvdy1mcmVxdWVuY3knLFxuXHRcdCdjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmFtb3VudCAuYS1idXR0b24tZmxpcCcsXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5lbnRlciBpbnB1dC5hbW91bnQtZW50cnknLFxuXHR9OyAvLyBlbmQgZGVmYXVsdHNcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cblx0XHRpbml0OiBmdW5jdGlvbiggcmVzZXQsIGFtb3VudCApIHtcblx0XHRcdC8vIFBsYWNlIGluaXRpYWxpemF0aW9uIGxvZ2ljIGhlcmVcblx0XHRcdC8vIFlvdSBhbHJlYWR5IGhhdmUgYWNjZXNzIHRvIHRoZSBET00gZWxlbWVudCBhbmRcblx0XHRcdC8vIHRoZSBvcHRpb25zIHZpYSB0aGUgaW5zdGFuY2UsIGUuZy4gdGhpcy5lbGVtZW50XG5cdFx0XHQvLyBhbmQgdGhpcy5vcHRpb25zXG5cdFx0XHQvLyB5b3UgY2FuIGFkZCBtb3JlIGZ1bmN0aW9ucyBsaWtlIHRoZSBvbmUgYmVsb3cgYW5kXG5cdFx0XHQvLyBjYWxsIHRoZW0gbGlrZSBzbzogdGhpcy55b3VyT3RoZXJGdW5jdGlvbih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucykuXG5cdFx0XHR0aGlzLmNhdGNoSGFzaExpbmtzKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLmxldmVsRmxpcHBlciggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuc3RhcnRMZXZlbENsaWNrKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdH0sXG5cblx0XHRjYXRjaEhhc2hMaW5rczogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCdhW2hyZWYqPVwiI1wiXTpub3QoW2hyZWY9XCIjXCJdKScsIGVsZW1lbnQpLmNsaWNrKGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0dmFyIHRhcmdldCA9ICQoZS50YXJnZXQpO1xuXHRcdFx0XHRpZiAodGFyZ2V0LnBhcmVudCgnLmNvbW1lbnQtdGl0bGUnKS5sZW5ndGggPT0gMCAmJiBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgPT0gdGhpcy5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgJiYgbG9jYXRpb24uaG9zdG5hbWUgPT0gdGhpcy5ob3N0bmFtZSkge1xuXHRcdFx0XHRcdHZhciB0YXJnZXQgPSAkKHRoaXMuaGFzaCk7XG5cdFx0XHRcdFx0dGFyZ2V0ID0gdGFyZ2V0Lmxlbmd0aCA/IHRhcmdldCA6ICQoJ1tuYW1lPScgKyB0aGlzLmhhc2guc2xpY2UoMSkgKyddJyk7XG5cdFx0XHRcdFx0aWYgKHRhcmdldC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdCQoJ2h0bWwsYm9keScpLmFuaW1hdGUoe1xuXHRcdFx0XHRcdFx0XHRzY3JvbGxUb3A6IHRhcmdldC5vZmZzZXQoKS50b3Bcblx0XHRcdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIGNhdGNoTGlua3NcblxuXHRcdGxldmVsRmxpcHBlcjogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgYW1vdW50ID0gMDtcblx0XHRcdHZhciBsZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX251bWJlciA9IDA7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeSA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gJyc7XG5cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbHNfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCApLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5mbGlwcGVkX2l0ZW1zLCAkKHRoaXMpICkud3JhcEFsbCggJzxkaXYgY2xhc3M9XCJmbGlwcGVyXCIvPicgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKHRoaXMpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXG5cdFx0XHRcdFx0XHRpZiAoIGZyZXF1ZW5jeSA9PSAxICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC15ZWFybHknICkgKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeSA9PSAxMiApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQtbW9udGhseScgKSApO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cblx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlRnJlcXVlbmN5KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAkKCBvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciwgZWxlbWVudCkudGV4dChmcmVxdWVuY3lfbmFtZSk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS52YWwoKTtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRoYXQuY2hhbmdlQW1vdW50UHJldmlldyggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpLnBhcmVudCgpICkudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgbGV2ZWxGbGlwcGVyXG5cblx0XHRjaGVja0xldmVsOiBmdW5jdGlvbiggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgbGV2ZWwgPSBNaW5uUG9zdE1lbWJlcnNoaXAuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUgKTtcblxuXHRcdFx0JCgnaDInLCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKCAkKHRoaXMpLnRleHQoKSA9PSBsZXZlbFsnbmFtZSddICkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0JCh0aGlzKS5wYXJlbnQoKS5wYXJlbnQoKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGNoYW5nZUZyZXF1ZW5jeTogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0XHR2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHRcdHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0dmFyIGZyZXF1ZW5jeSAgICAgID0gcGFyc2VJbnQoIHNlbGVjdGVkLnNwbGl0KCcgLSAnKVsxXSApO1xuXG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnZhbCggc2VsZWN0ZWQgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkucHJvcCggJ3NlbGVjdGVkJywgc2VsZWN0ZWQgKTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS5kYXRhKCAnZnJlcXVlbmN5JywgZnJlcXVlbmN5ICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlRnJlcXVlbmN5XG5cblx0XHRjaGFuZ2VBbW91bnRQcmV2aWV3OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHRcdHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdFx0dmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlQW1vdW50UHJldmlld1xuXG5cdFx0c3RhcnRMZXZlbENsaWNrOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJy5zdGFydC1sZXZlbCcpLmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgbGV2ZWxfY2xhc3MgPSAkKCB0aGlzICkucHJvcCggJ2NsYXNzJyApO1xuXHRcdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gbGV2ZWxfY2xhc3NbbGV2ZWxfY2xhc3MubGVuZ3RoIC0xXTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIsIGVsZW1lbnQgKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICsgJyAnICsgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBzdGFydExldmVsQ2xpY2tcblxuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xuXG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXAgKTtcbiJdfQ==
