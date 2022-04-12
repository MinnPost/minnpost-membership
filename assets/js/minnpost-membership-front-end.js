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
      $subscriptions.on('click', this.onSubscriptionsClick.bind(this)); // when the form is submitted

      document.querySelectorAll(".m-form-membership").forEach(function (membershipForm) {
        return membershipForm.addEventListener("submit", function (event) {
          _this.onFormSubmit(event);
        });
      });
    },
    // end init

    /*
     * add to analytics cart
    */
    analyticsCart: function analyticsCart(level, amount, frequency_label) {
      var product = this.analyticsProduct(level, amount, frequency_label);
      wp.hooks.doAction('minnpostMembershipAnalyticsEcommerceAction', 'event', 'add_to_cart', product);
    },
    // end analyticsCart
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
      this.analyticsCart(level['name'], amount, frequency_label);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsIm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCIkIiwiZG9jdW1lbnQiLCJwbHVnaW5OYW1lIiwiZGVmYXVsdHMiLCJmcmVxdWVuY3lTZWxlY3RvciIsImFtb3VudEdyb3VwIiwiYW1vdW50U2VsZWN0b3IiLCJhbW91bnRMYWJlbHMiLCJhbW91bnRWYWx1ZSIsImFtb3VudERlc2NyaXB0aW9uIiwiYW1vdW50RmllbGQiLCJjdXN0b21BbW91bnRGcmVxdWVuY3kiLCJsZXZlbFZpZXdlciIsImxldmVsTmFtZSIsInVzZXJDdXJyZW50TGV2ZWwiLCJkZWNsaW5lQmVuZWZpdHMiLCJnaWZ0U2VsZWN0aW9uR3JvdXAiLCJzd2FnRWxpZ2liaWxpdHlUZXh0Iiwic3dhZ1NlbGVjdG9yIiwic3dhZ0xhYmVscyIsInN1YnNjcmlwdGlvbnNTZWxlY3RvciIsInN1YnNjcmlwdGlvbnNMYWJlbHMiLCJtaW5BbW91bnRzIiwiZGVjbGluZVN1YnNjcmlwdGlvbnMiLCJQbHVnaW4iLCJlbGVtZW50Iiwib3B0aW9ucyIsImV4dGVuZCIsIl9kZWZhdWx0cyIsIl9uYW1lIiwiaW5pdCIsIiRmcmVxdWVuY3kiLCJmaW5kIiwiJGZvcm0iLCIkc3VnZ2VzdGVkQW1vdW50IiwiJGFtb3VudCIsIiRkZWNsaW5lQmVuZWZpdHMiLCIkc3Vic2NyaXB0aW9ucyIsImxlbmd0aCIsInNldEFtb3VudExhYmVscyIsImZpbHRlciIsInZhbCIsInNldE1pbkFtb3VudHMiLCJjaGVja0FuZFNldExldmVsIiwib24iLCJvbkZyZXF1ZW5jeUNoYW5nZSIsImJpbmQiLCJvblN1Z2dlc3RlZEFtb3VudENoYW5nZSIsIm9uQW1vdW50Q2hhbmdlIiwibm90IiwiaXMiLCJwcm9wIiwib25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UiLCJvblN1YnNjcmlwdGlvbnNDbGljayIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJmb3JFYWNoIiwibWVtYmVyc2hpcEZvcm0iLCJhZGRFdmVudExpc3RlbmVyIiwiZXZlbnQiLCJvbkZvcm1TdWJtaXQiLCJhbmFseXRpY3NDYXJ0IiwiZnJlcXVlbmN5X2xhYmVsIiwicHJvZHVjdCIsImFuYWx5dGljc1Byb2R1Y3QiLCJ3cCIsImhvb2tzIiwiZG9BY3Rpb24iLCJ0b0xvd2VyQ2FzZSIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJ0YXJnZXQiLCJjbGVhckFtb3VudFNlbGVjdG9yIiwiJHRhcmdldCIsIiRnaWZ0U2VsZWN0aW9uR3JvdXAiLCJkZWNsaW5lIiwiaGlkZSIsInNob3ciLCIkZGVjbGluZSIsImZyZXF1ZW5jeV9zdHJpbmciLCJzcGxpdCIsImZyZXF1ZW5jeV9uYW1lIiwiZnJlcXVlbmN5X2lkIiwidGV4dCIsImNhdGVnb3J5IiwiYWN0aW9uIiwibGFiZWwiLCJsb2NhdGlvbiIsInBhdGhuYW1lIiwiaGFzQ2xhc3MiLCJjbGFzc0xpc3QiLCJjb250YWlucyIsImZyZXF1ZW5jeVN0cmluZyIsIiRncm91cHMiLCIkc2VsZWN0ZWQiLCJpbmRleCIsIiRjdXN0b21BbW91bnRGcmVxdWVuY3kiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiY3VycmVudEZyZXF1ZW5jeUxhYmVsIiwiZmlyc3QiLCIkZWxlbWVudHMiLCJzaG93TmV3TGV2ZWwiLCJzZXRFbmFibGVkR2lmdHMiLCJtZW1iZXJfbGV2ZWxfcHJlZml4Iiwib2xkX2xldmVsIiwibGV2ZWxWaWV3ZXJDb250YWluZXIiLCJkZWNvZGVIdG1sRW50aXR5Iiwic3RyIiwicmVwbGFjZSIsIm1hdGNoIiwiZGVjIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwibWVtYmVyX2xldmVsIiwiaHRtbCIsInNldEVuYWJsZWQiLCJ5ZWFybHlBbW91bnQiLCJlYWNoIiwiZm4iLCJqUXVlcnkiLCJiZW5lZml0Rm9ybSIsInBlcmZvcm1hbmNlIiwibmF2aWdhdGlvbiIsInJlbG9hZCIsInJlbW92ZUF0dHIiLCJjbGljayIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsIiRzdGF0dXMiLCJwYXJlbnQiLCIkc2VsZWN0IiwiYmVuZWZpdFR5cGUiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwic3VjY2VzcyIsImJ1dHRvbl92YWx1ZSIsImJ1dHRvbl9sYWJlbCIsImJ1dHRvbl9jbGFzcyIsImJ1dHRvbl9hdHRyIiwibWVzc2FnZSIsIm1lc3NhZ2VfY2xhc3MiLCJhdHRyIiwicmVtb3ZlX2luc3RhbmNlX3ZhbHVlIiwiaSIsInJlbW92ZSIsInJlYWR5IiwiYnV0dG9uIiwicXVlcnlTZWxlY3RvciIsInZhbHVlIiwic3ZnIiwiYXR0cmlidXRlIiwiZ2V0QXR0cmlidXRlIiwidGV4dENvbnRlbnQiLCJ1bmRlZmluZWQiLCJyZXNldCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwiZSIsImhvc3RuYW1lIiwiaGFzaCIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwibGV2ZWxfbnVtYmVyIiwibGV2ZWxzX2NvbnRhaW5lciIsInNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yIiwiZmxpcHBlZF9pdGVtcyIsIndyYXBBbGwiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsImNsb3Nlc3QiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwiY2hhbmdlQW1vdW50UHJldmlldyIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7QUFBQyxDQUFDLFVBQVdBLE1BQVgsRUFBb0I7QUFDckIsV0FBU0Msa0JBQVQsQ0FBNkJDLElBQTdCLEVBQW1DQyxRQUFuQyxFQUE4QztBQUM3QyxTQUFLRCxJQUFMLEdBQVksRUFBWjs7QUFDQSxRQUFJLE9BQU9BLElBQVAsS0FBZ0IsV0FBcEIsRUFBaUM7QUFDaEMsV0FBS0EsSUFBTCxHQUFZQSxJQUFaO0FBQ0E7O0FBRUQsU0FBS0MsUUFBTCxHQUFnQixFQUFoQjs7QUFDQSxRQUFJLE9BQU9BLFFBQVAsS0FBb0IsV0FBeEIsRUFBcUM7QUFDcEMsV0FBS0EsUUFBTCxHQUFnQkEsUUFBaEI7QUFDQTs7QUFFRCxTQUFLQyxjQUFMLEdBQXNCLEVBQXRCOztBQUNBLFFBQUssT0FBTyxLQUFLRixJQUFMLENBQVVHLFlBQWpCLEtBQWtDLFdBQWxDLElBQ0EsT0FBTyxLQUFLSCxJQUFMLENBQVVHLFlBQVYsQ0FBdUJDLGVBQTlCLEtBQWtELFdBRHZELEVBQ3FFO0FBQ3BFLFdBQUtGLGNBQUwsR0FBc0IsS0FBS0YsSUFBTCxDQUFVRyxZQUFWLENBQXVCQyxlQUE3QztBQUNBO0FBQ0Q7O0FBRURMLEVBQUFBLGtCQUFrQixDQUFDTSxTQUFuQixHQUErQjtBQUM5QkMsSUFBQUEsVUFB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QTREOUksT0FBTyxDQUFDZ0osNkJBQXRFLENBQUQsQ0FBdUd4RSxRQUF2RyxDQUFpSCxTQUFqSDtBQUNBLE9BUEQ7QUFRQSxLQTFLaUIsQ0EwS2Y7O0FBMUtlLEdBQW5CLENBbkNpRSxDQStNOUQ7QUFFSDtBQUNBOztBQUNBbEcsRUFBQUEsQ0FBQyxDQUFDdUgsRUFBRixDQUFLckgsVUFBTCxJQUFtQixVQUFXd0IsT0FBWCxFQUFxQjtBQUN2QyxXQUFPLEtBQUs0RixJQUFMLENBQVUsWUFBWTtBQUM1QixVQUFLLENBQUV0SCxDQUFDLENBQUN2QixJQUFGLENBQVEsSUFBUixFQUFjLFlBQVl5QixVQUExQixDQUFQLEVBQWdEO0FBQy9DRixRQUFBQSxDQUFDLENBQUN2QixJQUFGLENBQVEsSUFBUixFQUFjLFlBQVl5QixVQUExQixFQUFzQyxJQUFJc0IsTUFBSixDQUFZLElBQVosRUFBa0JFLE9BQWxCLENBQXRDO0FBQ0E7QUFDRCxLQUpNLENBQVA7QUFLQSxHQU5EO0FBUUEsQ0EzTkEsRUEyTkc4RixNQTNOSCxFQTJOV2pKLE1BM05YLEVBMk5tQjBCLFFBM05uQixFQTJONkJ6QixrQkEzTjdCIiwiZmlsZSI6Im1pbm5wb3N0LW1lbWJlcnNoaXAtZnJvbnQtZW5kLmpzIiwic291cmNlc0NvbnRlbnQiOlsiOyhmdW5jdGlvbiAoIHdpbmRvdyApIHtcblx0ZnVuY3Rpb24gTWlublBvc3RNZW1iZXJzaGlwKCBkYXRhLCBzZXR0aW5ncyApIHtcblx0XHR0aGlzLmRhdGEgPSB7fTtcblx0XHRpZiAodHlwZW9mIGRhdGEgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHR0aGlzLmRhdGEgPSBkYXRhO1xuXHRcdH1cblxuXHRcdHRoaXMuc2V0dGluZ3MgPSB7fTtcblx0XHRpZiAodHlwZW9mIHNldHRpbmdzICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xuXHRcdH1cblxuXHRcdHRoaXMucHJldmlvdXNBbW91bnQgPSAnJztcblx0XHRpZiAoIHR5cGVvZiB0aGlzLmRhdGEuY3VycmVudF91c2VyICE9PSAndW5kZWZpbmVkJyAmJlxuXHRcdCAgICAgdHlwZW9mIHRoaXMuZGF0YS5jdXJyZW50X3VzZXIucHJldmlvdXNfYW1vdW50ICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdHRoaXMucHJldmlvdXNBbW91bnQgPSB0aGlzLmRhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudDtcblx0XHR9XG5cdH1cblxuXHRNaW5uUG9zdE1lbWJlcnNoaXAucHJvdG90eXBlID0ge1xuXHRcdGNoZWNrTGV2ZWw6IGZ1bmN0aW9uKCBhbW91bnQsIGZyZXF1ZW5jeSwgdHlwZSApIHtcblx0XHRcdHZhciB0aGlzeWVhciA9IHBhcnNlSW50KCBhbW91bnQgKSAqIHBhcnNlSW50KCBmcmVxdWVuY3kgKTtcblx0XHRcdGlmICggdHlwZW9mIHRoaXMucHJldmlvdXNBbW91bnQgIT09ICd1bmRlZmluZWQnICYmIHRoaXMucHJldmlvdXNBbW91bnQgIT09ICcnICkge1xuXHRcdFx0XHR2YXIgcHJpb3JfeWVhcl9hbW91bnQgPSBwYXJzZUludCggdGhpcy5wcmV2aW91c0Ftb3VudC5wcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMsIDEwICk7XG5cdFx0XHRcdHZhciBjb21pbmdfeWVhcl9hbW91bnQgPSBwYXJzZUludCggdGhpcy5wcmV2aW91c0Ftb3VudC5jb21pbmdfeWVhcl9jb250cmlidXRpb25zLCAxMCApO1xuXHRcdFx0XHR2YXIgYW5udWFsX3JlY3VycmluZ19hbW91bnQgPSBwYXJzZUludCggdGhpcy5wcmV2aW91c0Ftb3VudC5hbm51YWxfcmVjdXJyaW5nX2Ftb3VudCwgMTAgKTtcblx0XHRcdFx0Ly8gY2FsY3VsYXRlIG1lbWJlciBsZXZlbCBmb3JtdWxhXG5cdFx0XHRcdGlmICggdHlwZSA9PT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRwcmlvcl95ZWFyX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCArPSB0aGlzeWVhcjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRoaXN5ZWFyID0gTWF0aC5tYXgoIHByaW9yX3llYXJfYW1vdW50LCBjb21pbmdfeWVhcl9hbW91bnQsIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ICk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiB0aGlzLmdldExldmVsKCB0aGlzeWVhciApO1xuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRnZXRMZXZlbDogZnVuY3Rpb24oIHRoaXN5ZWFyICkge1xuXHRcdFx0dmFyIGxldmVsID0ge1xuXHRcdFx0XHQneWVhcmx5QW1vdW50JzogdGhpc3llYXJcblx0XHRcdH07XG5cdFx0XHRpZiAoIHRoaXN5ZWFyID4gMCAmJiB0aGlzeWVhciA8IDYwICkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ0Jyb256ZSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDE7XG5cdFx0XHR9XG5cdFx0XHRlbHNlIGlmICh0aGlzeWVhciA+IDU5ICYmIHRoaXN5ZWFyIDwgMTIwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnU2lsdmVyJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMjtcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAxMTkgJiYgdGhpc3llYXIgPCAyNDApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdHb2xkJztcblx0XHRcdFx0bGV2ZWxbJ251bWJlciddID0gMztcblx0XHRcdH0gZWxzZSBpZiAodGhpc3llYXIgPiAyMzkpIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdQbGF0aW51bSc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDQ7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGdldExldmVsXG5cdH07XG5cblx0d2luZG93Lk1pbm5Qb3N0TWVtYmVyc2hpcCA9IG5ldyBNaW5uUG9zdE1lbWJlcnNoaXAoXG5cdFx0d2luZG93Lm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSxcblx0XHR3aW5kb3cubWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5nc1xuXHQpO1xufSkoIHdpbmRvdyApO1xuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwICkge1xuXHQvLyBDcmVhdGUgdGhlIGRlZmF1bHRzIG9uY2Vcblx0dmFyIHBsdWdpbk5hbWUgPSAnbWlubnBvc3RBbW91bnRTZWxlY3QnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHRmcmVxdWVuY3lTZWxlY3RvcjogJy5tLWZyZXF1ZW5jeS1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRhbW91bnRHcm91cDogJy5tLWZyZXF1ZW5jeS1ncm91cCcsXG5cdFx0YW1vdW50U2VsZWN0b3I6ICcubS1hbW91bnQtc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0YW1vdW50TGFiZWxzOiAnLm0tYW1vdW50LXNlbGVjdCBsYWJlbCcsXG5cdFx0YW1vdW50VmFsdWU6ICdzdHJvbmcnLFxuXHRcdGFtb3VudERlc2NyaXB0aW9uOiAnLmEtYW1vdW50LWRlc2NyaXB0aW9uJyxcblx0XHRhbW91bnRGaWVsZDogJy5hLWFtb3VudC1maWVsZCAjYW1vdW50Jyxcblx0XHRjdXN0b21BbW91bnRGcmVxdWVuY3k6ICcjYW1vdW50LWl0ZW0gLmEtZnJlcXVlbmN5LXRleHQtbGFiZWwnLFxuXHRcdGxldmVsVmlld2VyOiAnLmEtc2hvdy1sZXZlbCcsXG5cdFx0bGV2ZWxOYW1lOiAnLmEtbGV2ZWwnLFxuXHRcdHVzZXJDdXJyZW50TGV2ZWw6ICcuYS1jdXJyZW50LWxldmVsJyxcblx0XHRkZWNsaW5lQmVuZWZpdHM6ICcubS1kZWNsaW5lLWJlbmVmaXRzLXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGdpZnRTZWxlY3Rpb25Hcm91cDogJy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvcicsXG5cdFx0c3dhZ0VsaWdpYmlsaXR5VGV4dDogJy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvciAuc3dhZy1lbGlnaWJpbGl0eScsXG5cdFx0c3dhZ1NlbGVjdG9yOiAnLm0tc2VsZWN0LXN3YWcgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRzd2FnTGFiZWxzOiAnLm0tc2VsZWN0LXN3YWcgaW5wdXRbdHlwZT1cInJhZGlvXCJdICsgbGFiZWwnLFxuXHRcdHN1YnNjcmlwdGlvbnNTZWxlY3RvcjogJy5tLXNlbGVjdC1zdWJzY3JpcHRpb24gaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRzdWJzY3JpcHRpb25zTGFiZWxzOiAnLm0tc2VsZWN0LXN1YnNjcmlwdGlvbiBpbnB1dFt0eXBlPVwicmFkaW9cIl0gKyBsYWJlbCcsXG5cdFx0bWluQW1vdW50czogJy5tLW1lbWJlcnNoaXAtZ2lmdC1zZWxlY3RvciAubWluLWFtb3VudCcsXG5cdFx0ZGVjbGluZVN1YnNjcmlwdGlvbnM6ICcjc3Vic2NyaXB0aW9uLWRlY2xpbmUnXG5cdH07XG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblx0XHRpbml0OiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciAkZnJlcXVlbmN5ID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICk7XG5cdFx0XHR2YXIgJGZvcm0gPSAkKCB0aGlzLmVsZW1lbnQgKTtcblx0XHRcdHZhciAkc3VnZ2VzdGVkQW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yICk7XG5cdFx0XHR2YXIgJGFtb3VudCA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCApO1xuXHRcdFx0dmFyICRkZWNsaW5lQmVuZWZpdHMgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZGVjbGluZUJlbmVmaXRzICk7XG5cdFx0XHR2YXIgJHN1YnNjcmlwdGlvbnMgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuc3Vic2NyaXB0aW9uc1NlbGVjdG9yICk7XG5cdFx0XHRpZiAoICEoICRhbW91bnQubGVuZ3RoID4gMCAmJlxuXHRcdFx0ICAgICAgICAkZnJlcXVlbmN5Lmxlbmd0aCA+IDAgJiZcblx0XHRcdCAgICAgICAgJHN1Z2dlc3RlZEFtb3VudC5sZW5ndGggPiAwICkgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2V0IHVwIHRoZSBVSSBmb3IgdGhlIGN1cnJlbnQgZmllbGQgc3RhdGUgb24gKHJlLSlsb2FkXG5cdFx0XHR0aGlzLnNldEFtb3VudExhYmVscyggJGZyZXF1ZW5jeS5maWx0ZXIoJzpjaGVja2VkJykudmFsKCkgKTtcblx0XHRcdHRoaXMuc2V0TWluQW1vdW50cyggJGZyZXF1ZW5jeS5maWx0ZXIoJzpjaGVja2VkJykudmFsKCkgKTtcblx0XHRcdHRoaXMuY2hlY2tBbmRTZXRMZXZlbCgpO1xuXG5cdFx0XHQkZnJlcXVlbmN5Lm9uKCAnY2hhbmdlJywgdGhpcy5vbkZyZXF1ZW5jeUNoYW5nZS5iaW5kKHRoaXMpICk7XG5cdFx0XHQkc3VnZ2VzdGVkQW1vdW50Lm9uKCAnY2hhbmdlJywgdGhpcy5vblN1Z2dlc3RlZEFtb3VudENoYW5nZS5iaW5kKHRoaXMpICk7XG5cdFx0XHQkYW1vdW50Lm9uKCAna2V5dXAgbW91c2V1cCcsIHRoaXMub25BbW91bnRDaGFuZ2UuYmluZCh0aGlzKSApO1xuXG5cdFx0XHRpZiAoICEgKCAkZGVjbGluZUJlbmVmaXRzLmxlbmd0aCA+IDAgJiYgJHN1YnNjcmlwdGlvbnMubGVuZ3RoID4gMCApICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNldCB1cCB0aGUgVUkgZm9yIHRoZSBjdXJyZW50IGZpZWxkIHN0YXRlIG9uIChyZS0pbG9hZFxuXHRcdFx0aWYgKCAkc3Vic2NyaXB0aW9ucy5ub3QoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHRcdCQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHRcdH1cblx0XHRcdHRoaXMub25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UoKTtcblxuXHRcdFx0JGRlY2xpbmVCZW5lZml0cy5vbiggJ2NoYW5nZScsIHRoaXMub25EZWNsaW5lQmVuZWZpdHNDaGFuZ2UuYmluZCggdGhpcyApICk7XG5cdFx0XHQkc3Vic2NyaXB0aW9ucy5vbiggJ2NsaWNrJywgdGhpcy5vblN1YnNjcmlwdGlvbnNDbGljay5iaW5kKCB0aGlzICkgKTtcblxuXHRcdFx0Ly8gd2hlbiB0aGUgZm9ybSBpcyBzdWJtaXR0ZWRcblx0XHRcdGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoIFwiLm0tZm9ybS1tZW1iZXJzaGlwXCIgKS5mb3JFYWNoKFxuXHRcdFx0XHRtZW1iZXJzaGlwRm9ybSA9PiBtZW1iZXJzaGlwRm9ybS5hZGRFdmVudExpc3RlbmVyKCBcInN1Ym1pdFwiLCAoIGV2ZW50ICkgPT4ge1xuXHRcdFx0XHRcdHRoaXMub25Gb3JtU3VibWl0KCBldmVudCApO1xuXHRcdFx0XHR9IClcblx0XHRcdCk7XG5cblx0XHR9LCAvLyBlbmQgaW5pdFxuXG5cdFx0IC8qXG5cdFx0ICAqIGFkZCB0byBhbmFseXRpY3MgY2FydFxuXHRcdCAqL1xuXHRcdCBhbmFseXRpY3NDYXJ0OiBmdW5jdGlvbiggbGV2ZWwsIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsICkge1xuXHRcdFx0dmFyIHByb2R1Y3QgPSB0aGlzLmFuYWx5dGljc1Byb2R1Y3QobGV2ZWwsIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsICk7XG5cdFx0XHR3cC5ob29rcy5kb0FjdGlvbiggJ21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0Vjb21tZXJjZUFjdGlvbicsICdldmVudCcsICdhZGRfdG9fY2FydCcsIHByb2R1Y3QgKTtcblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzQ2FydFxuXG5cdFx0YW5hbHl0aWNzUHJvZHVjdDogZnVuY3Rpb24oIGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCApIHtcblx0XHRcdGxldCBwcm9kdWN0ID0ge1xuXHRcdFx0XHQnaWQnOiAnbWlubnBvc3RfJyArIGxldmVsLnRvTG93ZXJDYXNlKCkgKyAnX21lbWJlcnNoaXAnLFxuXHRcdFx0XHQnbmFtZSc6ICdNaW5uUG9zdCAnICsgbGV2ZWwuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBsZXZlbC5zbGljZSgxKSArICcgTWVtYmVyc2hpcCcsXG5cdFx0XHRcdCdjYXRlZ29yeSc6ICdEb25hdGlvbicsXG5cdFx0XHRcdCdicmFuZCc6ICdNaW5uUG9zdCcsXG5cdFx0XHRcdCd2YXJpYW50JzogIGZyZXF1ZW5jeV9sYWJlbCxcblx0XHRcdFx0J3ByaWNlJzogYW1vdW50LFxuXHRcdFx0XHQncXVhbnRpdHknOiAxXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcHJvZHVjdDtcblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzUHJvZHVjdFxuXG5cdFx0b25GcmVxdWVuY3lDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMuc2V0QW1vdW50TGFiZWxzKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSApO1xuXHRcdFx0dGhpcy5zZXRNaW5BbW91bnRzKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSApO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCk7XG5cdFx0fSwgLy8gZW5kIG9uRnJlcXVlbmN5Q2hhbmdlXG5cblx0XHRvblN1Z2dlc3RlZEFtb3VudENoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0JCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICkudmFsKCBudWxsICk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoKTtcblx0XHR9LCAvLyBlbmQgb25TdWdnZXN0ZWRBbW91bnRDaGFuZ2VcblxuXHRcdG9uQW1vdW50Q2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR0aGlzLmNsZWFyQW1vdW50U2VsZWN0b3IoIGV2ZW50ICk7XG5cblx0XHRcdHZhciAkdGFyZ2V0ID0gJCggZXZlbnQudGFyZ2V0ICk7XG5cdFx0XHRpZiAoICR0YXJnZXQuZGF0YSggJ2xhc3QtdmFsdWUnICkgIT0gJHRhcmdldC52YWwoKSApIHtcblx0XHRcdFx0JHRhcmdldC5kYXRhKCAnbGFzdC12YWx1ZScsICR0YXJnZXQudmFsKCkgKTtcblx0XHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIG9uQW1vdW50Q2hhbmdlXG5cblx0XHRvbkRlY2xpbmVCZW5lZml0c0NoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyICRnaWZ0U2VsZWN0aW9uR3JvdXAgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZ2lmdFNlbGVjdGlvbkdyb3VwICk7XG5cdFx0XHR2YXIgZGVjbGluZSA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lQmVuZWZpdHMgKS5maWx0ZXIoICc6Y2hlY2tlZCcgKS52YWwoKTtcblxuXHRcdFx0aWYgKCBkZWNsaW5lID09PSAndHJ1ZScgKSB7XG5cdFx0XHRcdCRnaWZ0U2VsZWN0aW9uR3JvdXAuaGlkZSgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRnaWZ0U2VsZWN0aW9uR3JvdXAuc2hvdygpO1xuXHRcdH0sIC8vIGVuZCBvbkRlY2xpbmVCZW5lZml0c0NoYW5nZVxuXG5cdFx0b25TdWJzY3JpcHRpb25zQ2xpY2s6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciAkc3Vic2NyaXB0aW9ucyA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5zdWJzY3JpcHRpb25zU2VsZWN0b3IgKS5ub3QoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApO1xuXHRcdFx0dmFyICRkZWNsaW5lID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVTdWJzY3JpcHRpb25zICk7XG5cblx0XHRcdGlmICggJCggZXZlbnQudGFyZ2V0ICkuaXMoIHRoaXMub3B0aW9ucy5kZWNsaW5lU3Vic2NyaXB0aW9ucyApICkge1xuXHRcdFx0XHQkc3Vic2NyaXB0aW9ucy5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JGRlY2xpbmUucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdH0sIC8vIGVuZCBvblN1YnNjcmlwdGlvbnNDaGFuZ2VcblxuXHRcdG9uRm9ybVN1Ym1pdDogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIGFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApLmZpbHRlciggJzpjaGVja2VkJyApLnZhbCgpO1xuXHRcdFx0aWYgKCB0eXBlb2YgYW1vdW50ID09PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0YW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICkudmFsKCk7XG5cdFx0XHR9XG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdHZhciBmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9pZCA9ICQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCcgKS5wcm9wKCAnaWQnICk7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X2xhYmVsID0gJCggJ2xhYmVsW2Zvcj1cIicgKyBmcmVxdWVuY3lfaWQgKyAnXCJdJyApLnRleHQoKTtcblx0XHRcdHZhciBsZXZlbCA9IE1pbm5Qb3N0TWVtYmVyc2hpcC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUgKTtcblxuXHRcdFx0dmFyIG9wdGlvbnMgPSB7XG5cdFx0XHRcdHR5cGU6ICdldmVudCcsXG5cdFx0XHRcdGNhdGVnb3J5OiAnU3VwcG9ydCBVcycsXG5cdFx0XHRcdGFjdGlvbjogJ0JlY29tZSBBIE1lbWJlcicsXG5cdFx0XHRcdGxhYmVsOiBsb2NhdGlvbi5wYXRobmFtZVxuXHRcdFx0fTtcblx0XHRcdC8vIHRoaXMgdHJhY2tzIGFuIGV2ZW50IHN1Ym1pc3Npb24gYmFzZWQgb24gdGhlIHBsdWdpbiBvcHRpb25zXG5cdFx0XHQvLyBpdCBhbHNvIGJ1YmJsZXMgdGhlIGV2ZW50IHVwIHRvIHN1Ym1pdCB0aGUgZm9ybVxuXHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oXG5cdFx0XHRcdCdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFdmVudCcsXG5cdFx0XHRcdG9wdGlvbnMudHlwZSxcblx0XHRcdFx0b3B0aW9ucy5jYXRlZ29yeSxcblx0XHRcdFx0b3B0aW9ucy5hY3Rpb24sXG5cdFx0XHRcdG9wdGlvbnMubGFiZWxcblx0XHRcdCk7XG5cdFx0XHR2YXIgaGFzQ2xhc3MgPSBldmVudC50YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCBcIm0tZm9ybS1tZW1iZXJzaGlwLXN1cHBvcnRcIiApO1xuXHRcdFx0Ly8gaWYgdGhpcyBpcyB0aGUgbWFpbiBjaGVja291dCBmb3JtLCBzZW5kIGl0IHRvIHRoZSBlYyBwbHVnaW4gYXMgYSBjaGVja291dFxuXHRcdFx0aWYgKCBoYXNDbGFzcyApIHtcblx0XHRcdFx0dmFyIHByb2R1Y3QgPSB0aGlzLmFuYWx5dGljc1Byb2R1Y3QoIGxldmVsWyduYW1lJ10sIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsICk7XG5cdFx0XHRcdHdwLmhvb2tzLmRvQWN0aW9uKCAnbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRWNvbW1lcmNlQWN0aW9uJywgJ2V2ZW50JywgJ2JlZ2luX2NoZWNrb3V0JywgcHJvZHVjdCApO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBvbkZvcm1TdWJtaXRcblxuXHRcdGNsZWFyQW1vdW50U2VsZWN0b3I6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciAkc3VnZ2VzdGVkQW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yICk7XG5cblx0XHRcdGlmICggJCggZXZlbnQudGFyZ2V0ICkudmFsKCkgPT09ICcnICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRzdWdnZXN0ZWRBbW91bnQucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdH0sIC8vIGVuZCBjbGVhckFtb3VudFNlbGVjdG9yXG5cblx0XHRzZXRBbW91bnRMYWJlbHM6IGZ1bmN0aW9uKCBmcmVxdWVuY3lTdHJpbmcgKSB7XG5cdFx0XHR2YXIgJGdyb3VwcyA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRHcm91cCApO1xuXHRcdFx0dmFyICRzZWxlY3RlZCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApXG5cdFx0XHQgICAgLmZpbHRlciggJzpjaGVja2VkJyApO1xuXHRcdFx0dmFyIGluZGV4ID0gJHNlbGVjdGVkLmRhdGEoICdpbmRleCcgKTtcblx0XHRcdHZhciAkY3VzdG9tQW1vdW50RnJlcXVlbmN5ID0gJCggdGhpcy5vcHRpb25zLmN1c3RvbUFtb3VudEZyZXF1ZW5jeSApO1xuXG5cdFx0XHQkZ3JvdXBzLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0JGdyb3Vwcy5maWx0ZXIoICdbZGF0YS1mcmVxdWVuY3k9XCInICsgZnJlcXVlbmN5U3RyaW5nICsgJ1wiXScgKVxuXHRcdFx0XHQuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQkc2VsZWN0ZWQucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdFx0JGdyb3Vwcy5maWx0ZXIoICcuYWN0aXZlJyApXG5cdFx0XHRcdC5maW5kKCAnaW5wdXRbdHlwZT1cInJhZGlvXCJdW2RhdGEtaW5kZXg9XCInICsgaW5kZXggKyAnXCJdJyApXG5cdFx0XHRcdC5wcm9wKCAnY2hlY2tlZCcsIHRydWUgKTtcblxuXHRcdFx0dmFyIGN1cnJlbnRGcmVxdWVuY3lMYWJlbCA9ICRncm91cHMuZmlsdGVyKCAnLmFjdGl2ZScgKS5maW5kKCcuYS1mcmVxdWVuY3ktdGV4dC1sYWJlbCcpLmZpcnN0KCkudGV4dCgpO1xuXHRcdFx0JGN1c3RvbUFtb3VudEZyZXF1ZW5jeS50ZXh0KCBjdXJyZW50RnJlcXVlbmN5TGFiZWwgKTtcblx0XHR9LCAvLyBlbmQgc2V0QW1vdW50TGFiZWxzXG5cblx0XHRzZXRNaW5BbW91bnRzOiBmdW5jdGlvbiggZnJlcXVlbmN5U3RyaW5nICkge1xuXHRcdFx0dmFyICRlbGVtZW50cyA9ICQoIHRoaXMub3B0aW9ucy5taW5BbW91bnRzICk7XG5cdFx0XHQkZWxlbWVudHMucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQkZWxlbWVudHMuZmlsdGVyKCAnW2RhdGEtZnJlcXVlbmN5PVwiJyArIGZyZXF1ZW5jeVN0cmluZyArICdcIl0nIClcblx0XHRcdFx0LmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdH0sIC8vIGVuZCBzZXRNaW5BbW91bnRzXG5cblx0XHRjaGVja0FuZFNldExldmVsOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBhbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKS5maWx0ZXIoICc6Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdGlmICggdHlwZW9mIGFtb3VudCA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCApLnZhbCgpO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdHZhciBmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9pZCA9ICQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCcgKS5wcm9wKCAnaWQnICk7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X2xhYmVsID0gJCggJ2xhYmVsW2Zvcj1cIicgKyBmcmVxdWVuY3lfaWQgKyAnXCJdJyApLnRleHQoKTtcblxuXHRcdFx0dmFyIGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSApO1xuXHRcdFx0dGhpcy5zaG93TmV3TGV2ZWwoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zLCBsZXZlbCApO1xuXHRcdFx0dGhpcy5zZXRFbmFibGVkR2lmdHMoIGxldmVsICk7XG5cdFx0XHR0aGlzLmFuYWx5dGljc0NhcnQoIGxldmVsWyduYW1lJ10sIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsICk7XG5cdFx0fSwgLy8gZW5kIGNoZWNrQW5kU2V0TGV2ZWxcblxuXHRcdHNob3dOZXdMZXZlbDogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICkge1xuXHRcdFx0dmFyIG1lbWJlcl9sZXZlbF9wcmVmaXggPSAnJztcblx0XHRcdHZhciBvbGRfbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbFZpZXdlckNvbnRhaW5lciA9IG9wdGlvbnMubGV2ZWxWaWV3ZXI7IC8vIHRoaXMgc2hvdWxkIGNoYW5nZSB3aGVuIHdlIHJlcGxhY2UgdGhlIHRleHQsIGlmIHRoZXJlIGlzIGEgbGluayBpbnNpZGUgaXRcblx0XHRcdHZhciBkZWNvZGVIdG1sRW50aXR5ID0gZnVuY3Rpb24oIHN0ciApIHtcblx0XHRcdFx0cmV0dXJuIHN0ci5yZXBsYWNlKCAvJiMoXFxkKyk7L2csIGZ1bmN0aW9uKCBtYXRjaCwgZGVjICkge1xuXHRcdFx0XHRcdHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKCBkZWMgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0bWVtYmVyX2xldmVsX3ByZWZpeCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5tZW1iZXJfbGV2ZWxfcHJlZml4O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbFZpZXdlcikucHJvcCggJ2NsYXNzJywgJ2Etc2hvdy1sZXZlbCBhLXNob3ctbGV2ZWwtJyArIGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApO1xuXG5cdFx0XHRcdGlmICggJCggb3B0aW9ucy51c2VyQ3VycmVudExldmVsICkubGVuZ3RoID4gMCAmJiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdFx0aWYgKCAnYScsICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdFx0bGV2ZWxWaWV3ZXJDb250YWluZXIgPSBvcHRpb25zLmxldmVsVmlld2VyICsgJyBhJztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvbGRfbGV2ZWwgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5yZXBsYWNlKCBtZW1iZXJfbGV2ZWxfcHJlZml4LCAnJyApO1xuXG5cdFx0XHRcdFx0aWYgKCBvbGRfbGV2ZWwgIT09IGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApIHtcblx0XHRcdFx0XHRcdCQoIGxldmVsVmlld2VyQ29udGFpbmVyICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmRhdGEoICdjaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggbGV2ZWxWaWV3ZXJDb250YWluZXIgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsVmlld2VyICkuZGF0YSggJ25vdC1jaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxOYW1lLCBvcHRpb25zLmxldmVsVmlld2VyKS50ZXh0KCBsZXZlbFsnbmFtZSddICk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIHNob3dOZXdMZXZlbFxuXG5cdFx0c2V0RW5hYmxlZEdpZnRzOiBmdW5jdGlvbiggbGV2ZWwgKSB7XG5cdFx0XHR2YXIgc2V0RW5hYmxlZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCB0aGlzICkucHJvcCggJ2Rpc2FibGVkJywgbGV2ZWwueWVhcmx5QW1vdW50IDwgJCggdGhpcyApLmRhdGEoICdtaW5ZZWFybHlBbW91bnQnICkgKTtcblx0XHRcdH07XG5cblx0XHRcdCQoIHRoaXMub3B0aW9ucy5zd2FnU2VsZWN0b3IgKS5lYWNoKCBzZXRFbmFibGVkICk7XG5cdFx0XHQkKCB0aGlzLm9wdGlvbnMuc3Vic2NyaXB0aW9uc1NlbGVjdG9yICkuZWFjaCggc2V0RW5hYmxlZCApO1xuXG5cdFx0XHRpZiAoICQoIHRoaXMub3B0aW9ucy5zd2FnU2VsZWN0b3IgKS5ub3QoICcjc3dhZy1kZWNsaW5lJyApLmlzKCAnOmVuYWJsZWQnICkgKSB7XG5cdFx0XHRcdCQoICcuc3dhZy1kaXNhYmxlZCcgKS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0JCggJy5zd2FnLWVuYWJsZWQnICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkKCAnLnN3YWctZGlzYWJsZWQnICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoICcuc3dhZy1lbmFibGVkJyApLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBzZXRFbmFibGVkR2lmdHNcblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwICk7XG4iLCIoIGZ1bmN0aW9uKCAkICkge1xuXG5cdGZ1bmN0aW9uIGJlbmVmaXRGb3JtKCkge1xuXHRcdGlmICggMiA9PT0gcGVyZm9ybWFuY2UubmF2aWdhdGlvbi50eXBlICkge1xuXHRcdFx0bG9jYXRpb24ucmVsb2FkKCB0cnVlICk7XG5cdFx0fVxuXHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbi5hLWJ1dHRvbi1kaXNhYmxlZCcgKS5yZW1vdmVBdHRyKCAnZGlzYWJsZWQnICk7XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0dmFyICRidXR0b24gID0gJCggdGhpcyApO1xuXHRcdFx0dmFyICRzdGF0dXMgID0gJCggJy5tLWJlbmVmaXQtbWVzc2FnZScsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyICRzZWxlY3QgID0gJCggJ3NlbGVjdCcsICQoIHRoaXMgKS5wYXJlbnQoKSApO1xuXHRcdFx0dmFyIHNldHRpbmdzID0gbWlubnBvc3RfbWVtYmVyc2hpcF9zZXR0aW5ncztcblx0XHRcdC8vIHJlc2V0IHRoZSBtZXNzYWdlIGZvciBjdXJyZW50IHN0YXR1c1xuXHRcdFx0aWYgKCAhICcubS1iZW5lZml0LW1lc3NhZ2Utc3VjY2VzcycgKSB7XG5cdFx0XHRcdCQoICcubS1iZW5lZml0LW1lc3NhZ2UnICkucmVtb3ZlQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlIG0tYmVuZWZpdC1tZXNzYWdlLWVycm9yIG0tYmVuZWZpdC1tZXNzYWdlLWluZm8nICk7XG5cdFx0XHR9XG5cdFx0XHQvLyBzZXQgYnV0dG9uIHRvIHByb2Nlc3Npbmdcblx0XHRcdCRidXR0b24udGV4dCggJ1Byb2Nlc3NpbmcnICkuYWRkQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblxuXHRcdFx0Ly8gZGlzYWJsZSBhbGwgdGhlIG90aGVyIGJ1dHRvbnNcblx0XHRcdCQoICcuYS1iZW5lZml0LWJ1dHRvbicgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXG5cdFx0XHQvLyBzZXQgYWpheCBkYXRhXG5cdFx0XHR2YXIgZGF0YSA9IHt9O1xuXHRcdFx0dmFyIGJlbmVmaXRUeXBlID0gJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nICkudmFsKCk7XG5cdFx0XHRpZiAoICdwYXJ0bmVyLW9mZmVycycgPT09IGJlbmVmaXRUeXBlICkge1xuXHRcdFx0XHRkYXRhID0ge1xuXHRcdFx0XHRcdCdhY3Rpb24nIDogJ2JlbmVmaXRfZm9ybV9zdWJtaXQnLFxuXHRcdFx0XHRcdCdtaW5ucG9zdF9tZW1iZXJzaGlwX2JlbmVmaXRfZm9ybV9ub25jZScgOiAkYnV0dG9uLmRhdGEoICdiZW5lZml0LW5vbmNlJyApLFxuXHRcdFx0XHRcdCdjdXJyZW50X3VybCcgOiAkKCAnaW5wdXRbbmFtZT1cImN1cnJlbnRfdXJsXCJdJykudmFsKCksXG5cdFx0XHRcdFx0J2JlbmVmaXQtbmFtZSc6ICQoICdpbnB1dFtuYW1lPVwiYmVuZWZpdC1uYW1lXCJdJykudmFsKCksXG5cdFx0XHRcdFx0J2luc3RhbmNlX2lkJyA6ICQoICdbbmFtZT1cImluc3RhbmNlLWlkLScgKyAkYnV0dG9uLnZhbCgpICsgJ1wiXScgKS52YWwoKSxcblx0XHRcdFx0XHQncG9zdF9pZCcgOiAkYnV0dG9uLnZhbCgpLFxuXHRcdFx0XHRcdCdpc19hamF4JyA6ICcxJyxcblx0XHRcdFx0fTtcblxuXHRcdFx0XHQkLnBvc3QoIHNldHRpbmdzLmFqYXh1cmwsIGRhdGEsIGZ1bmN0aW9uKCByZXNwb25zZSApIHtcblx0XHRcdFx0XHQvLyBzdWNjZXNzXG5cdFx0XHRcdFx0aWYgKCB0cnVlID09PSByZXNwb25zZS5zdWNjZXNzICkge1xuXHRcdFx0XHRcdFx0Ly9jb25zb2xlLmRpcihyZXNwb25zZSk7XG5cdFx0XHRcdFx0XHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0JHN0YXR1cy5odG1sKCByZXNwb25zZS5kYXRhLm1lc3NhZ2UgKS5hZGRDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZV9jbGFzcyApO1xuXHRcdFx0XHRcdFx0aWYgKCAwIDwgJHNlbGVjdC5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRcdCRzZWxlY3QucHJvcCggJ2Rpc2FibGVkJywgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS5hdHRyKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdC8vIGVycm9yXG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiByZXNwb25zZS5kYXRhLnJlbW92ZV9pbnN0YW5jZV92YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0JCggJ29wdGlvbicsICRzZWxlY3QgKS5lYWNoKCBmdW5jdGlvbiggaSApIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoICQoIHRoaXMgKS52YWwoKSA9PT0gcmVzcG9uc2UuZGF0YS5yZW1vdmVfaW5zdGFuY2VfdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHQkKCB0aGlzICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0aWYgKCAnJyAhPT0gcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKSB7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi5zaG93KCk7XG5cdFx0XHRcdFx0XHRcdFx0JGJ1dHRvbi52YWwoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX3ZhbHVlICkudGV4dCggcmVzcG9uc2UuZGF0YS5idXR0b25fbGFiZWwgKS5yZW1vdmVDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApLmFkZENsYXNzKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9jbGFzcyApLnByb3AoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2F0dHIsIHRydWUgKTtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLmhpZGUoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ly8gcmUtZW5hYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0XHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLm5vdCggJGJ1dHRvbiApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0XHQkc3RhdHVzLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmFkZENsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzICk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cblx0JCggZG9jdW1lbnQgKS5yZWFkeSggZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCAwIDwgJCggJy5tLWZvcm0tbWVtYmVyc2hpcC1iZW5lZml0JyApLmxlbmd0aCApIHtcblx0XHRcdGJlbmVmaXRGb3JtKCk7XG5cdFx0fVxuXHRcdCQoICcuYS1yZWZyZXNoLXBhZ2UnICkub24oICdjbGljaycsIGZ1bmN0aW9uICggZXZlbnQgKSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0bG9jYXRpb24ucmVsb2FkKCk7XG5cdFx0fSk7XG5cdH0pO1xuXG59ICkoIGpRdWVyeSApO1xuIiwiY29uc3QgYnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvciggJy5tLXN1cHBvcnQtY3RhLXRvcCAuYS1zdXBwb3J0LWJ1dHRvbicgKTtcbmlmICggYnV0dG9uICkge1xuXHRidXR0b24uYWRkRXZlbnRMaXN0ZW5lciggJ2NsaWNrJywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdHZhciB2YWx1ZSA9ICcnO1xuXHRcdGNvbnN0IHN2ZyA9IGJ1dHRvbi5xdWVyeVNlbGVjdG9yKCAnc3ZnJyApO1xuXHRcdGlmICggbnVsbCAhPT0gc3ZnICkge1xuXHRcdFx0bGV0IGF0dHJpYnV0ZSA9IHN2Zy5nZXRBdHRyaWJ1dGUoICd0aXRsZScgKTtcblx0XHRcdGlmICggbnVsbCAhPT0gYXR0cmlidXRlICkge1xuXHRcdFx0XHR2YWx1ZSA9IGF0dHJpYnV0ZSArICcgJztcblx0XHRcdH1cblx0XHR9XG5cdFx0dmFsdWUgPSB2YWx1ZSArIGJ1dHRvbi50ZXh0Q29udGVudDtcblx0XHR3cC5ob29rcy5kb0FjdGlvbignbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRXZlbnQnLCAnZXZlbnQnLCAnU3VwcG9ydCBDVEEgLSBIZWFkZXInLCAnQ2xpY2s6ICcgKyB2YWx1ZSwgbG9jYXRpb24ucGF0aG5hbWUpO1xuXHR9KTtcbn1cbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCwgdW5kZWZpbmVkICkge1xuXG5cdC8vIENyZWF0ZSB0aGUgZGVmYXVsdHMgb25jZVxuXHR2YXIgcGx1Z2luTmFtZSA9ICdtaW5ucG9zdE1lbWJlcnNoaXAnLFxuXHRkZWZhdWx0cyA9IHtcblx0XHQnZGVidWcnIDogZmFsc2UsIC8vIHRoaXMgY2FuIGJlIHNldCB0byB0cnVlIG9uIHBhZ2UgbGV2ZWwgb3B0aW9uc1xuXHRcdCdhbW91bnRfdmlld2VyJyA6ICcuYW1vdW50IGgzJyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmEtZm9ybS1pdGVtLW1lbWJlcnNoaXAtZnJlcXVlbmN5Jyxcblx0XHQnZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVsc190eXBlJyA6ICdzZWxlY3QnLFxuXHRcdCdsZXZlbHNfY29udGFpbmVyJyA6ICcuby1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbHMnLFxuXHRcdCdzaW5nbGVfbGV2ZWxfY29udGFpbmVyJyA6ICcubS1tZW1iZXJzaGlwLW1lbWJlci1sZXZlbCcsXG5cdFx0J3NpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yJyA6ICcubS1tZW1iZXItbGV2ZWwtYnJpZWYnLFxuXHRcdCdmbGlwcGVkX2l0ZW1zJyA6ICdkaXYuYW1vdW50LCBkaXYuZW50ZXInLFxuXHRcdCdsZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvcicgOiAnLnNob3ctZnJlcXVlbmN5Jyxcblx0XHQnY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5hbW91bnQgLmEtYnV0dG9uLWZsaXAnLFxuXHRcdCdhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuZW50ZXIgaW5wdXQuYW1vdW50LWVudHJ5Jyxcblx0fTsgLy8gZW5kIGRlZmF1bHRzXG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblxuXHRcdC8vIGpRdWVyeSBoYXMgYW4gZXh0ZW5kIG1ldGhvZCB3aGljaCBtZXJnZXMgdGhlIGNvbnRlbnRzIG9mIHR3byBvclxuXHRcdC8vIG1vcmUgb2JqZWN0cywgc3RvcmluZyB0aGUgcmVzdWx0IGluIHRoZSBmaXJzdCBvYmplY3QuIFRoZSBmaXJzdCBvYmplY3Rcblx0XHQvLyBpcyBnZW5lcmFsbHkgZW1wdHkgYXMgd2UgZG9uJ3Qgd2FudCB0byBhbHRlciB0aGUgZGVmYXVsdCBvcHRpb25zIGZvclxuXHRcdC8vIGZ1dHVyZSBpbnN0YW5jZXMgb2YgdGhlIHBsdWdpblxuXHRcdHRoaXMub3B0aW9ucyA9ICQuZXh0ZW5kKCB7fSwgZGVmYXVsdHMsIG9wdGlvbnMgKTtcblxuXHRcdHRoaXMuX2RlZmF1bHRzID0gZGVmYXVsdHM7XG5cdFx0dGhpcy5fbmFtZSA9IHBsdWdpbk5hbWU7XG5cblx0XHR0aGlzLmluaXQoKTtcblx0fSAvLyBlbmQgY29uc3RydWN0b3JcblxuXHRQbHVnaW4ucHJvdG90eXBlID0ge1xuXG5cdFx0aW5pdDogZnVuY3Rpb24oIHJlc2V0LCBhbW91bnQgKSB7XG5cdFx0XHQvLyBQbGFjZSBpbml0aWFsaXphdGlvbiBsb2dpYyBoZXJlXG5cdFx0XHQvLyBZb3UgYWxyZWFkeSBoYXZlIGFjY2VzcyB0byB0aGUgRE9NIGVsZW1lbnQgYW5kXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyB2aWEgdGhlIGluc3RhbmNlLCBlLmcuIHRoaXMuZWxlbWVudFxuXHRcdFx0Ly8gYW5kIHRoaXMub3B0aW9uc1xuXHRcdFx0Ly8geW91IGNhbiBhZGQgbW9yZSBmdW5jdGlvbnMgbGlrZSB0aGUgb25lIGJlbG93IGFuZFxuXHRcdFx0Ly8gY2FsbCB0aGVtIGxpa2Ugc286IHRoaXMueW91ck90aGVyRnVuY3Rpb24odGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpLlxuXHRcdFx0dGhpcy5jYXRjaEhhc2hMaW5rcyggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5sZXZlbEZsaXBwZXIoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zICk7XG5cdFx0XHR0aGlzLnN0YXJ0TGV2ZWxDbGljayggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHR9LFxuXG5cdFx0Y2F0Y2hIYXNoTGlua3M6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCgnYVtocmVmKj1cIiNcIl06bm90KFtocmVmPVwiI1wiXSknLCBlbGVtZW50KS5jbGljayhmdW5jdGlvbihlKSB7XG5cdFx0XHRcdHZhciB0YXJnZXQgPSAkKGUudGFyZ2V0KTtcblx0XHRcdFx0aWYgKHRhcmdldC5wYXJlbnQoJy5jb21tZW50LXRpdGxlJykubGVuZ3RoID09IDAgJiYgbG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpID09IHRoaXMucGF0aG5hbWUucmVwbGFjZSgvXlxcLy8sJycpICYmIGxvY2F0aW9uLmhvc3RuYW1lID09IHRoaXMuaG9zdG5hbWUpIHtcblx0XHRcdFx0XHR2YXIgdGFyZ2V0ID0gJCh0aGlzLmhhc2gpO1xuXHRcdFx0XHRcdHRhcmdldCA9IHRhcmdldC5sZW5ndGggPyB0YXJnZXQgOiAkKCdbbmFtZT0nICsgdGhpcy5oYXNoLnNsaWNlKDEpICsnXScpO1xuXHRcdFx0XHRcdGlmICh0YXJnZXQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQkKCdodG1sLGJvZHknKS5hbmltYXRlKHtcblx0XHRcdFx0XHRcdFx0c2Nyb2xsVG9wOiB0YXJnZXQub2Zmc2V0KCkudG9wXG5cdFx0XHRcdFx0XHR9LCAxMDAwKTtcblx0XHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBjYXRjaExpbmtzXG5cblx0XHRsZXZlbEZsaXBwZXI6IGZ1bmN0aW9uKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIHRoYXQgPSB0aGlzO1xuXHRcdFx0dmFyIGFtb3VudCA9IDA7XG5cdFx0XHR2YXIgbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbF9udW1iZXIgPSAwO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9zdHJpbmcgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3kgPSAnJztcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9ICcnO1xuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxzX2NvbnRhaW5lciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQgKS5lYWNoKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuZmxpcHBlZF9pdGVtcywgJCh0aGlzKSApLndyYXBBbGwoICc8ZGl2IGNsYXNzPVwiZmxpcHBlclwiLz4nICk7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5vbignY2hhbmdlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCh0aGlzKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQodGhpcykudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X25hbWUgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0XHRpZiAoIHR5cGVvZiBsZXZlbF9udW1iZXIgIT09ICd1bmRlZmluZWQnICkge1xuXG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdFx0JCggZXZlbnQudGFyZ2V0ICkuY2xvc2VzdCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBmcmVxdWVuY3kgPT0gMSApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQteWVhcmx5JyApICk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3kgPT0gMTIgKSB7XG5cdFx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS52YWwoICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICkgKS5kYXRhKCdkZWZhdWx0LW1vbnRobHknICkgKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXG5cdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHR0aGF0LmNoYW5nZUZyZXF1ZW5jeSggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJCggb3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxfZnJlcXVlbmN5X3RleHRfc2VsZWN0b3IsIGVsZW1lbnQpLnRleHQoZnJlcXVlbmN5X25hbWUpO1xuXHRcdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQob3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpKS5kYXRhKCdtZW1iZXItbGV2ZWwtbnVtYmVyJyk7XG5cdFx0XHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkudmFsKCk7XG5cdFx0XHRcdFx0XHRcdFx0bGV2ZWwgPSB0aGF0LmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGF0LmNoYW5nZUFtb3VudFByZXZpZXcoIGZyZXF1ZW5jeV9zdHJpbmcsIGxldmVsWyduYW1lJ10sIGVsZW1lbnQsIG9wdGlvbnMgKTtcblxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGlmICggJCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyApLmxlbmd0aCA+IDAgKSB7XG5cdFx0XHRcdCQoIG9wdGlvbnMuY2hvb3NlX2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsIGVsZW1lbnQgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdGxldmVsX251bWJlciA9ICQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeV9zdHJpbmcgPSAkKG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgJCh0aGlzKS5wYXJlbnQoKSApLnZhbCgpO1xuXHRcdFx0XHRcdGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0XHRcdGFtb3VudCA9ICQoIG9wdGlvbnMuYW1vdW50X3NlbGVjdG9yX2luX2xldmVscyArICdbZGF0YS1tZW1iZXItbGV2ZWwtbnVtYmVyPVwiJyArIGxldmVsX251bWJlciArICdcIl0nKS52YWwoKTtcblx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIGxldmVsRmxpcHBlclxuXG5cdFx0Y2hlY2tMZXZlbDogZnVuY3Rpb24oIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0dmFyIGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCB0eXBlICk7XG5cblx0XHRcdCQoJ2gyJywgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvcikuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggJCh0aGlzKS50ZXh0KCkgPT0gbGV2ZWxbJ25hbWUnXSApIHtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQodGhpcykucGFyZW50KCkucGFyZW50KCkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBjaGVja0xldmVsXG5cblx0XHRjaGFuZ2VGcmVxdWVuY3k6IGZ1bmN0aW9uKCBzZWxlY3RlZCwgbGV2ZWwsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHZhciByYW5nZSAgICAgICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoKTtcblx0XHRcdFx0dmFyIG1vbnRoX3ZhbHVlICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnbW9udGgnKTtcblx0XHRcdFx0dmFyIHllYXJfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgneWVhcicpO1xuXHRcdFx0XHR2YXIgb25jZV92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdvbmUtdGltZScpO1xuXHRcdFx0XHR2YXIgZnJlcXVlbmN5X25hbWUgPSBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHRcdHZhciBmcmVxdWVuY3kgICAgICA9IHBhcnNlSW50KCBzZWxlY3RlZC5zcGxpdCgnIC0gJylbMV0gKTtcblxuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMgKS52YWwoIHNlbGVjdGVkICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnByb3AoICdzZWxlY3RlZCcsIHNlbGVjdGVkICk7XG5cblx0XHRcdFx0aWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIG1vbnRoJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG1vbnRoX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnJlbW92ZUNsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciB5ZWFyJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IHllYXJfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKGZyZXF1ZW5jeV9uYW1lID09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBvbmNlX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCdzbWFsbGVyJyApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCggcmFuZ2UgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpICkuZGF0YSggJ2ZyZXF1ZW5jeScsIGZyZXF1ZW5jeSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUZyZXF1ZW5jeVxuXG5cdFx0Y2hhbmdlQW1vdW50UHJldmlldzogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0XHR2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHRcdHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuXG5cdFx0XHR9ICk7XG5cdFx0fSwgLy8gZW5kIGNoYW5nZUFtb3VudFByZXZpZXdcblxuXHRcdHN0YXJ0TGV2ZWxDbGljazogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCcuc3RhcnQtbGV2ZWwnKS5jbGljayhmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIGxldmVsX2NsYXNzID0gJCggdGhpcyApLnByb3AoICdjbGFzcycgKTtcblx0XHRcdFx0dmFyIGxldmVsX251bWJlciA9IGxldmVsX2NsYXNzW2xldmVsX2NsYXNzLmxlbmd0aCAtMV07XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyLCBlbGVtZW50KS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyLCBlbGVtZW50ICkuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciArICcgJyArIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHR9KTtcblx0XHR9LCAvLyBlbmQgc3RhcnRMZXZlbENsaWNrXG5cblx0fTsgLy8gZW5kIFBsdWdpbi5wcm90b3R5cGVcblxuXHQvLyBBIHJlYWxseSBsaWdodHdlaWdodCBwbHVnaW4gd3JhcHBlciBhcm91bmQgdGhlIGNvbnN0cnVjdG9yLFxuXHQvLyBwcmV2ZW50aW5nIGFnYWluc3QgbXVsdGlwbGUgaW5zdGFudGlhdGlvbnNcblx0JC5mbltwbHVnaW5OYW1lXSA9IGZ1bmN0aW9uICggb3B0aW9ucyApIHtcblx0XHRyZXR1cm4gdGhpcy5lYWNoKGZ1bmN0aW9uICgpIHtcblx0XHRcdGlmICggISAkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUgKSApIHtcblx0XHRcdFx0JC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lLCBuZXcgUGx1Z2luKCB0aGlzLCBvcHRpb25zICkgKTtcblx0XHRcdH1cblx0XHR9KTtcblx0fTtcblxufSkoIGpRdWVyeSwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwICk7XG4iXX0=
