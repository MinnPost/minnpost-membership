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
    giftLevel: '.m-gift-level',
    giftSelector: '.m-gift-level .m-form-item input[type="radio"]',
    giftLabel: '.m-gift-level .m-form-item input[type="radio"] + label',
    swagEligibilityText: '.m-membership-gift-selector .swag-eligibility',
    swagSelector: '.m-select-swag input[type="radio"]',
    swagLabels: '.m-select-swag input[type="radio"] + label',
    minAmounts: '.m-membership-gift-selector .min-amount',
    declineGiftLevel: '.m-decline-level'
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
      var $gifts = $(this.element).find(this.options.giftSelector);

      if (!($amount.length > 0 && $frequency.length > 0 && $suggestedAmount.length > 0)) {
        return;
      } // Set up the UI for the current field state on (re-)load


      this.setAmountLabels($frequency.filter(':checked').val());
      this.setMinAmounts($frequency.filter(':checked').val());
      this.checkAndSetLevel(false);
      $frequency.on('change', this.onFrequencyChange.bind(this));
      $suggestedAmount.on('change', this.onSuggestedAmountChange.bind(this));
      $amount.on('keyup mouseup', this.onAmountChange.bind(this));

      if (!($declineBenefits.length > 0 && $gifts.length > 0)) {
        return;
      } // Set up the UI for the current field state on (re-)load


      if ($gifts.not(this.options.declineGiftLevel).is(':checked')) {
        $(this.element).find(this.options.declineGiftLevel).prop('checked', false);
      }

      this.onDeclineBenefitsChange();
      $declineBenefits.on('change', this.onDeclineBenefitsChange.bind(this));
      $gifts.on('click', this.onGiftLevelClick.bind(this)); // when the form is submitted

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
    onGiftLevelClick: function (event) {
      var $gifts = $(this.element).find(this.options.giftSelector).not(this.options.declineGiftLevel);
      var $decline = $(this.element).find(this.options.declineGiftLevel);

      if ($(event.target).is(this.options.declineGiftLevel)) {
        $gifts.prop('checked', false);
        return;
      }

      $decline.prop('checked', false);
    },
    // end onGiftLevelClick
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

      $(this.options.giftSelector).each(setEnabled);

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1pbm5wb3N0LW1lbWJlcnNoaXAuanMiLCJhbW91bnQtc2VsZWN0LmpzIiwiYmVuZWZpdHMuanMiLCJjdGEuanMiLCJtZW1iZXItbGV2ZWxzLmpzIl0sIm5hbWVzIjpbIndpbmRvdyIsIk1pbm5Qb3N0TWVtYmVyc2hpcCIsImRhdGEiLCJzZXR0aW5ncyIsInByZXZpb3VzQW1vdW50IiwiY3VycmVudF91c2VyIiwicHJldmlvdXNfYW1vdW50IiwicHJvdG90eXBlIiwiY2hlY2tMZXZlbCIsImFtb3VudCIsImZyZXF1ZW5jeSIsInR5cGUiLCJ0aGlzeWVhciIsInBhcnNlSW50IiwicHJpb3JfeWVhcl9hbW91bnQiLCJwcmlvcl95ZWFyX2NvbnRyaWJ1dGlvbnMiLCJjb21pbmdfeWVhcl9hbW91bnQiLCJjb21pbmdfeWVhcl9jb250cmlidXRpb25zIiwiYW5udWFsX3JlY3VycmluZ19hbW91bnQiLCJNYXRoIiwibWF4IiwiZ2V0TGV2ZWwiLCJsZXZlbCIsIm1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YSIsIm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3MiLCIkIiwiZG9jdW1lbnQiLCJwbHVnaW5OYW1lIiwiZGVmYXVsdHMiLCJmcmVxdWVuY3lTZWxlY3RvciIsImFtb3VudEdyb3VwIiwiYW1vdW50U2VsZWN0b3IiLCJhbW91bnRMYWJlbHMiLCJhbW91bnRWYWx1ZSIsImFtb3VudERlc2NyaXB0aW9uIiwiYW1vdW50RmllbGQiLCJjdXN0b21BbW91bnRGcmVxdWVuY3kiLCJsZXZlbFZpZXdlciIsImxldmVsTmFtZSIsInVzZXJDdXJyZW50TGV2ZWwiLCJkZWNsaW5lQmVuZWZpdHMiLCJnaWZ0U2VsZWN0aW9uR3JvdXAiLCJnaWZ0TGV2ZWwiLCJnaWZ0U2VsZWN0b3IiLCJnaWZ0TGFiZWwiLCJzd2FnRWxpZ2liaWxpdHlUZXh0Iiwic3dhZ1NlbGVjdG9yIiwic3dhZ0xhYmVscyIsIm1pbkFtb3VudHMiLCJkZWNsaW5lR2lmdExldmVsIiwiUGx1Z2luIiwiZWxlbWVudCIsIm9wdGlvbnMiLCJleHRlbmQiLCJfZGVmYXVsdHMiLCJfbmFtZSIsImluaXQiLCIkZnJlcXVlbmN5IiwiZmluZCIsIiRmb3JtIiwiJHN1Z2dlc3RlZEFtb3VudCIsIiRhbW91bnQiLCIkZGVjbGluZUJlbmVmaXRzIiwiJGdpZnRzIiwibGVuZ3RoIiwic2V0QW1vdW50TGFiZWxzIiwiZmlsdGVyIiwidmFsIiwic2V0TWluQW1vdW50cyIsImNoZWNrQW5kU2V0TGV2ZWwiLCJvbiIsIm9uRnJlcXVlbmN5Q2hhbmdlIiwiYmluZCIsIm9uU3VnZ2VzdGVkQW1vdW50Q2hhbmdlIiwib25BbW91bnRDaGFuZ2UiLCJub3QiLCJpcyIsInByb3AiLCJvbkRlY2xpbmVCZW5lZml0c0NoYW5nZSIsIm9uR2lmdExldmVsQ2xpY2siLCJxdWVyeVNlbGVjdG9yQWxsIiwiZm9yRWFjaCIsIm1lbWJlcnNoaXBGb3JtIiwiYWRkRXZlbnRMaXN0ZW5lciIsImV2ZW50Iiwib25Gb3JtU3VibWl0IiwiYW5hbHl0aWNzUHJvZHVjdEFjdGlvbiIsImZyZXF1ZW5jeV9sYWJlbCIsImFjdGlvbiIsInN0ZXAiLCJwcm9kdWN0IiwiYW5hbHl0aWNzUHJvZHVjdCIsIndwIiwiaG9va3MiLCJkb0FjdGlvbiIsInRvTG93ZXJDYXNlIiwiY2hhckF0IiwidG9VcHBlckNhc2UiLCJzbGljZSIsInRhcmdldCIsImNsZWFyQW1vdW50U2VsZWN0b3IiLCIkdGFyZ2V0IiwiJGdpZnRTZWxlY3Rpb25Hcm91cCIsImRlY2xpbmUiLCJoaWRlIiwic2hvdyIsIiRkZWNsaW5lIiwiZnJlcXVlbmN5X3N0cmluZyIsInNwbGl0IiwiZnJlcXVlbmN5X25hbWUiLCJmcmVxdWVuY3lfaWQiLCJ0ZXh0IiwiY2F0ZWdvcnkiLCJsYWJlbCIsImxvY2F0aW9uIiwicGF0aG5hbWUiLCJoYXNDbGFzcyIsImNsYXNzTGlzdCIsImNvbnRhaW5zIiwiZnJlcXVlbmN5U3RyaW5nIiwiJGdyb3VwcyIsIiRzZWxlY3RlZCIsImluZGV4IiwiJGN1c3RvbUFtb3VudEZyZXF1ZW5jeSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJjdXJyZW50RnJlcXVlbmN5TGFiZWwiLCJmaXJzdCIsIiRlbGVtZW50cyIsInVwZGF0ZWQiLCJzaG93TmV3TGV2ZWwiLCJzZXRFbmFibGVkR2lmdHMiLCJtZW1iZXJfbGV2ZWxfcHJlZml4Iiwib2xkX2xldmVsIiwibGV2ZWxWaWV3ZXJDb250YWluZXIiLCJkZWNvZGVIdG1sRW50aXR5Iiwic3RyIiwicmVwbGFjZSIsIm1hdGNoIiwiZGVjIiwiU3RyaW5nIiwiZnJvbUNoYXJDb2RlIiwibWVtYmVyX2xldmVsIiwiaHRtbCIsInNldEVuYWJsZWQiLCJ5ZWFybHlBbW91bnQiLCJlYWNoIiwiZm4iLCJqUXVlcnkiLCJiZW5lZml0Rm9ybSIsInBlcmZvcm1hbmNlIiwibmF2aWdhdGlvbiIsInJlbG9hZCIsInJlbW92ZUF0dHIiLCJjbGljayIsInByZXZlbnREZWZhdWx0IiwiJGJ1dHRvbiIsIiRzdGF0dXMiLCJwYXJlbnQiLCIkc2VsZWN0IiwiYmVuZWZpdFR5cGUiLCJwb3N0IiwiYWpheHVybCIsInJlc3BvbnNlIiwic3VjY2VzcyIsImJ1dHRvbl92YWx1ZSIsImJ1dHRvbl9sYWJlbCIsImJ1dHRvbl9jbGFzcyIsImJ1dHRvbl9hdHRyIiwibWVzc2FnZSIsIm1lc3NhZ2VfY2xhc3MiLCJhdHRyIiwicmVtb3ZlX2luc3RhbmNlX3ZhbHVlIiwiaSIsInJlbW92ZSIsInJlYWR5IiwiYnV0dG9uIiwicXVlcnlTZWxlY3RvciIsInZhbHVlIiwic3ZnIiwiYXR0cmlidXRlIiwiZ2V0QXR0cmlidXRlIiwidGV4dENvbnRlbnQiLCJ1bmRlZmluZWQiLCJyZXNldCIsImNhdGNoSGFzaExpbmtzIiwibGV2ZWxGbGlwcGVyIiwic3RhcnRMZXZlbENsaWNrIiwiZSIsImhvc3RuYW1lIiwiaGFzaCIsImFuaW1hdGUiLCJzY3JvbGxUb3AiLCJvZmZzZXQiLCJ0b3AiLCJ0aGF0IiwibGV2ZWxfbnVtYmVyIiwibGV2ZWxzX2NvbnRhaW5lciIsInNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yIiwiZmxpcHBlZF9pdGVtcyIsIndyYXBBbGwiLCJmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2luZ2xlX2xldmVsX2NvbnRhaW5lciIsImNsb3Nlc3QiLCJhbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwiYW1vdW50X3ZpZXdlciIsImNoYW5nZUZyZXF1ZW5jeSIsImxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yIiwiY2hhbmdlQW1vdW50UHJldmlldyIsImNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzIiwic2VsZWN0ZWQiLCJyYW5nZSIsIm1vbnRoX3ZhbHVlIiwieWVhcl92YWx1ZSIsIm9uY2VfdmFsdWUiLCJsZXZlbF9jbGFzcyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTs7QUFBQyxDQUFDLFVBQVdBLE1BQVgsRUFBb0I7RUFDckIsU0FBU0Msa0JBQVQsQ0FBNkJDLElBQTdCLEVBQW1DQyxRQUFuQyxFQUE4QztJQUM3QyxLQUFLRCxJQUFMLEdBQVksRUFBWjs7SUFDQSxJQUFJLE9BQU9BLElBQVAsS0FBZ0IsV0FBcEIsRUFBaUM7TUFDaEMsS0FBS0EsSUFBTCxHQUFZQSxJQUFaO0lBQ0E7O0lBRUQsS0FBS0MsUUFBTCxHQUFnQixFQUFoQjs7SUFDQSxJQUFJLE9BQU9BLFFBQVAsS0FBb0IsV0FBeEIsRUFBcUM7TUFDcEMsS0FBS0EsUUFBTCxHQUFnQkEsUUFBaEI7SUFDQTs7SUFFRCxLQUFLQyxjQUFMLEdBQXNCLEVBQXRCOztJQUNBLElBQUssT0FBTyxLQUFLRixJQUFMLENBQVVHLFlBQWpCLEtBQWtDLFdBQWxDLElBQ0EsT0FBTyxLQUFLSCxJQUFMLENBQVVHLFlBQVYsQ0FBdUJDLGVBQTlCLEtBQWtELFdBRHZELEVBQ3FFO01BQ3BFLEtBQUtGLGNBQUwsR0FBc0IsS0FBS0YsSUFBTCxDQUFVRyxZQUFWLENBQXVCQyxlQUE3QztJQUNBO0VBQ0Q7O0VBRURMLGtCQUFrQixDQUFDTSxTQUFuQixHQUErQjtJQUM5QkMsVUFBVSxFQUFFLFVB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QUFFekgsQ0FBQyxDQUFDdkIsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZeUIsVUFBMUIsQ0FBUCxFQUFnRDtRQUMvQ0YsQ0FBQyxDQUFDdkIsSUFBRixDQUFRLElBQVIsRUFBYyxZQUFZeUIsVUFBMUIsRUFBc0MsSUFBSXVCLE1BQUosQ0FBWSxJQUFaLEVBQWtCRSxPQUFsQixDQUF0QztNQUNBO0lBQ0QsQ0FKTSxDQUFQO0VBS0EsQ0FORDtBQVFBLENBM05BLEVBMk5HZ0csTUEzTkgsRUEyTldwSixNQTNOWCxFQTJObUIwQixRQTNObkIsRUEyTjZCekIsa0JBM043QiIsImZpbGUiOiJtaW5ucG9zdC1tZW1iZXJzaGlwLWZyb250LWVuZC5qcyIsInNvdXJjZXNDb250ZW50IjpbIjsoZnVuY3Rpb24gKCB3aW5kb3cgKSB7XG5cdGZ1bmN0aW9uIE1pbm5Qb3N0TWVtYmVyc2hpcCggZGF0YSwgc2V0dGluZ3MgKSB7XG5cdFx0dGhpcy5kYXRhID0ge307XG5cdFx0aWYgKHR5cGVvZiBkYXRhICE9PSAndW5kZWZpbmVkJykge1xuXHRcdFx0dGhpcy5kYXRhID0gZGF0YTtcblx0XHR9XG5cblx0XHR0aGlzLnNldHRpbmdzID0ge307XG5cdFx0aWYgKHR5cGVvZiBzZXR0aW5ncyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcblx0XHR9XG5cblx0XHR0aGlzLnByZXZpb3VzQW1vdW50ID0gJyc7XG5cdFx0aWYgKCB0eXBlb2YgdGhpcy5kYXRhLmN1cnJlbnRfdXNlciAhPT0gJ3VuZGVmaW5lZCcgJiZcblx0XHQgICAgIHR5cGVvZiB0aGlzLmRhdGEuY3VycmVudF91c2VyLnByZXZpb3VzX2Ftb3VudCAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHR0aGlzLnByZXZpb3VzQW1vdW50ID0gdGhpcy5kYXRhLmN1cnJlbnRfdXNlci5wcmV2aW91c19hbW91bnQ7XG5cdFx0fVxuXHR9XG5cblx0TWlublBvc3RNZW1iZXJzaGlwLnByb3RvdHlwZSA9IHtcblx0XHRjaGVja0xldmVsOiBmdW5jdGlvbiggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUgKSB7XG5cdFx0XHR2YXIgdGhpc3llYXIgPSBwYXJzZUludCggYW1vdW50ICkgKiBwYXJzZUludCggZnJlcXVlbmN5ICk7XG5cdFx0XHRpZiAoIHR5cGVvZiB0aGlzLnByZXZpb3VzQW1vdW50ICE9PSAndW5kZWZpbmVkJyAmJiB0aGlzLnByZXZpb3VzQW1vdW50ICE9PSAnJyApIHtcblx0XHRcdFx0dmFyIHByaW9yX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHRoaXMucHJldmlvdXNBbW91bnQucHJpb3JfeWVhcl9jb250cmlidXRpb25zLCAxMCApO1xuXHRcdFx0XHR2YXIgY29taW5nX3llYXJfYW1vdW50ID0gcGFyc2VJbnQoIHRoaXMucHJldmlvdXNBbW91bnQuY29taW5nX3llYXJfY29udHJpYnV0aW9ucywgMTAgKTtcblx0XHRcdFx0dmFyIGFubnVhbF9yZWN1cnJpbmdfYW1vdW50ID0gcGFyc2VJbnQoIHRoaXMucHJldmlvdXNBbW91bnQuYW5udWFsX3JlY3VycmluZ19hbW91bnQsIDEwICk7XG5cdFx0XHRcdC8vIGNhbGN1bGF0ZSBtZW1iZXIgbGV2ZWwgZm9ybXVsYVxuXHRcdFx0XHRpZiAoIHR5cGUgPT09ICdvbmUtdGltZScgKSB7XG5cdFx0XHRcdFx0cHJpb3JfeWVhcl9hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0YW5udWFsX3JlY3VycmluZ19hbW91bnQgKz0gdGhpc3llYXI7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0aGlzeWVhciA9IE1hdGgubWF4KCBwcmlvcl95ZWFyX2Ftb3VudCwgY29taW5nX3llYXJfYW1vdW50LCBhbm51YWxfcmVjdXJyaW5nX2Ftb3VudCApO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gdGhpcy5nZXRMZXZlbCggdGhpc3llYXIgKTtcblx0XHR9LCAvLyBlbmQgY2hlY2tMZXZlbFxuXG5cdFx0Z2V0TGV2ZWw6IGZ1bmN0aW9uKCB0aGlzeWVhciApIHtcblx0XHRcdHZhciBsZXZlbCA9IHtcblx0XHRcdFx0J3llYXJseUFtb3VudCc6IHRoaXN5ZWFyXG5cdFx0XHR9O1xuXHRcdFx0aWYgKCB0aGlzeWVhciA+IDAgJiYgdGhpc3llYXIgPCA2MCApIHtcblx0XHRcdFx0bGV2ZWxbJ25hbWUnXSA9ICdCcm9uemUnO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSAxO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSBpZiAodGhpc3llYXIgPiA1OSAmJiB0aGlzeWVhciA8IDEyMCkge1xuXHRcdFx0XHRsZXZlbFsnbmFtZSddID0gJ1NpbHZlcic7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDI7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMTE5ICYmIHRoaXN5ZWFyIDwgMjQwKSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnR29sZCc7XG5cdFx0XHRcdGxldmVsWydudW1iZXInXSA9IDM7XG5cdFx0XHR9IGVsc2UgaWYgKHRoaXN5ZWFyID4gMjM5KSB7XG5cdFx0XHRcdGxldmVsWyduYW1lJ10gPSAnUGxhdGludW0nO1xuXHRcdFx0XHRsZXZlbFsnbnVtYmVyJ10gPSA0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGxldmVsO1xuXHRcdH0sIC8vIGVuZCBnZXRMZXZlbFxuXHR9O1xuXG5cdHdpbmRvdy5NaW5uUG9zdE1lbWJlcnNoaXAgPSBuZXcgTWlublBvc3RNZW1iZXJzaGlwKFxuXHRcdHdpbmRvdy5taW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEsXG5cdFx0d2luZG93Lm1pbm5wb3N0X21lbWJlcnNoaXBfc2V0dGluZ3Ncblx0KTtcbn0pKCB3aW5kb3cgKTtcbiIsIi8vIHBsdWdpblxuOyhmdW5jdGlvbiAoICQsIHdpbmRvdywgZG9jdW1lbnQsIE1pbm5Qb3N0TWVtYmVyc2hpcCApIHtcblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0QW1vdW50U2VsZWN0Jyxcblx0ZGVmYXVsdHMgPSB7XG5cdFx0ZnJlcXVlbmN5U2VsZWN0b3I6ICcubS1mcmVxdWVuY3ktc2VsZWN0IGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0YW1vdW50R3JvdXA6ICcubS1mcmVxdWVuY3ktZ3JvdXAnLFxuXHRcdGFtb3VudFNlbGVjdG9yOiAnLm0tYW1vdW50LXNlbGVjdCBpbnB1dFt0eXBlPVwicmFkaW9cIl0nLFxuXHRcdGFtb3VudExhYmVsczogJy5tLWFtb3VudC1zZWxlY3QgbGFiZWwnLFxuXHRcdGFtb3VudFZhbHVlOiAnc3Ryb25nJyxcblx0XHRhbW91bnREZXNjcmlwdGlvbjogJy5hLWFtb3VudC1kZXNjcmlwdGlvbicsXG5cdFx0YW1vdW50RmllbGQ6ICcuYS1hbW91bnQtZmllbGQgI2Ftb3VudCcsXG5cdFx0Y3VzdG9tQW1vdW50RnJlcXVlbmN5OiAnI2Ftb3VudC1pdGVtIC5hLWZyZXF1ZW5jeS10ZXh0LWxhYmVsJyxcblx0XHRsZXZlbFZpZXdlcjogJy5hLXNob3ctbGV2ZWwnLFxuXHRcdGxldmVsTmFtZTogJy5hLWxldmVsJyxcblx0XHR1c2VyQ3VycmVudExldmVsOiAnLmEtY3VycmVudC1sZXZlbCcsXG5cdFx0ZGVjbGluZUJlbmVmaXRzOiAnLm0tZGVjbGluZS1iZW5lZml0cy1zZWxlY3QgaW5wdXRbdHlwZT1cInJhZGlvXCJdJyxcblx0XHRnaWZ0U2VsZWN0aW9uR3JvdXA6ICcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3InLFxuXHRcdGdpZnRMZXZlbDogJy5tLWdpZnQtbGV2ZWwnLFxuXHRcdGdpZnRTZWxlY3RvcjogJy5tLWdpZnQtbGV2ZWwgLm0tZm9ybS1pdGVtIGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0Z2lmdExhYmVsOiAnLm0tZ2lmdC1sZXZlbCAubS1mb3JtLWl0ZW0gaW5wdXRbdHlwZT1cInJhZGlvXCJdICsgbGFiZWwnLFxuXHRcdHN3YWdFbGlnaWJpbGl0eVRleHQ6ICcubS1tZW1iZXJzaGlwLWdpZnQtc2VsZWN0b3IgLnN3YWctZWxpZ2liaWxpdHknLFxuXHRcdHN3YWdTZWxlY3RvcjogJy5tLXNlbGVjdC1zd2FnIGlucHV0W3R5cGU9XCJyYWRpb1wiXScsXG5cdFx0c3dhZ0xhYmVsczogJy5tLXNlbGVjdC1zd2FnIGlucHV0W3R5cGU9XCJyYWRpb1wiXSArIGxhYmVsJyxcblx0XHRtaW5BbW91bnRzOiAnLm0tbWVtYmVyc2hpcC1naWZ0LXNlbGVjdG9yIC5taW4tYW1vdW50Jyxcblx0XHRkZWNsaW5lR2lmdExldmVsOiAnLm0tZGVjbGluZS1sZXZlbCcsXG5cdH07XG5cblx0Ly8gVGhlIGFjdHVhbCBwbHVnaW4gY29uc3RydWN0b3Jcblx0ZnVuY3Rpb24gUGx1Z2luKCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdHRoaXMuZWxlbWVudCA9IGVsZW1lbnQ7XG5cblx0XHQvLyBqUXVlcnkgaGFzIGFuIGV4dGVuZCBtZXRob2Qgd2hpY2ggbWVyZ2VzIHRoZSBjb250ZW50cyBvZiB0d28gb3Jcblx0XHQvLyBtb3JlIG9iamVjdHMsIHN0b3JpbmcgdGhlIHJlc3VsdCBpbiB0aGUgZmlyc3Qgb2JqZWN0LiBUaGUgZmlyc3Qgb2JqZWN0XG5cdFx0Ly8gaXMgZ2VuZXJhbGx5IGVtcHR5IGFzIHdlIGRvbid0IHdhbnQgdG8gYWx0ZXIgdGhlIGRlZmF1bHQgb3B0aW9ucyBmb3Jcblx0XHQvLyBmdXR1cmUgaW5zdGFuY2VzIG9mIHRoZSBwbHVnaW5cblx0XHR0aGlzLm9wdGlvbnMgPSAkLmV4dGVuZCgge30sIGRlZmF1bHRzLCBvcHRpb25zICk7XG5cblx0XHR0aGlzLl9kZWZhdWx0cyA9IGRlZmF1bHRzO1xuXHRcdHRoaXMuX25hbWUgPSBwbHVnaW5OYW1lO1xuXG5cdFx0dGhpcy5pbml0KCk7XG5cdH0gLy8gZW5kIGNvbnN0cnVjdG9yXG5cblx0UGx1Z2luLnByb3RvdHlwZSA9IHtcblx0XHRpbml0OiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciAkZnJlcXVlbmN5ID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICk7XG5cdFx0XHR2YXIgJGZvcm0gPSAkKCB0aGlzLmVsZW1lbnQgKTtcblx0XHRcdHZhciAkc3VnZ2VzdGVkQW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yICk7XG5cdFx0XHR2YXIgJGFtb3VudCA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCApO1xuXHRcdFx0dmFyICRkZWNsaW5lQmVuZWZpdHMgPSAkKCB0aGlzLmVsZW1lbnQgKS5maW5kKCB0aGlzLm9wdGlvbnMuZGVjbGluZUJlbmVmaXRzICk7XG5cdFx0XHR2YXIgJGdpZnRzID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmdpZnRTZWxlY3RvciApO1xuXHRcdFx0aWYgKCAhKCAkYW1vdW50Lmxlbmd0aCA+IDAgJiZcblx0XHRcdCAgICAgICAgJGZyZXF1ZW5jeS5sZW5ndGggPiAwICYmXG5cdFx0XHQgICAgICAgICRzdWdnZXN0ZWRBbW91bnQubGVuZ3RoID4gMCApICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNldCB1cCB0aGUgVUkgZm9yIHRoZSBjdXJyZW50IGZpZWxkIHN0YXRlIG9uIChyZS0pbG9hZFxuXHRcdFx0dGhpcy5zZXRBbW91bnRMYWJlbHMoICRmcmVxdWVuY3kuZmlsdGVyKCc6Y2hlY2tlZCcpLnZhbCgpICk7XG5cdFx0XHR0aGlzLnNldE1pbkFtb3VudHMoICRmcmVxdWVuY3kuZmlsdGVyKCc6Y2hlY2tlZCcpLnZhbCgpICk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoIGZhbHNlICk7XG5cblx0XHRcdCRmcmVxdWVuY3kub24oICdjaGFuZ2UnLCB0aGlzLm9uRnJlcXVlbmN5Q2hhbmdlLmJpbmQodGhpcykgKTtcblx0XHRcdCRzdWdnZXN0ZWRBbW91bnQub24oICdjaGFuZ2UnLCB0aGlzLm9uU3VnZ2VzdGVkQW1vdW50Q2hhbmdlLmJpbmQodGhpcykgKTtcblx0XHRcdCRhbW91bnQub24oICdrZXl1cCBtb3VzZXVwJywgdGhpcy5vbkFtb3VudENoYW5nZS5iaW5kKHRoaXMpICk7XG5cblx0XHRcdGlmICggISAoICRkZWNsaW5lQmVuZWZpdHMubGVuZ3RoID4gMCAmJiAkZ2lmdHMubGVuZ3RoID4gMCApICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFNldCB1cCB0aGUgVUkgZm9yIHRoZSBjdXJyZW50IGZpZWxkIHN0YXRlIG9uIChyZS0pbG9hZFxuXHRcdFx0aWYgKCAkZ2lmdHMubm90KCB0aGlzLm9wdGlvbnMuZGVjbGluZUdpZnRMZXZlbCApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHRcdCQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lR2lmdExldmVsICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLm9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlKCk7XG5cblx0XHRcdCRkZWNsaW5lQmVuZWZpdHMub24oICdjaGFuZ2UnLCB0aGlzLm9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlLmJpbmQoIHRoaXMgKSApO1xuXHRcdFx0JGdpZnRzLm9uKCAnY2xpY2snLCB0aGlzLm9uR2lmdExldmVsQ2xpY2suYmluZCggdGhpcyApICk7XG5cblx0XHRcdC8vIHdoZW4gdGhlIGZvcm0gaXMgc3VibWl0dGVkXG5cdFx0XHRkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCBcIi5tLWZvcm0tbWVtYmVyc2hpcFwiICkuZm9yRWFjaChcblx0XHRcdFx0bWVtYmVyc2hpcEZvcm0gPT4gbWVtYmVyc2hpcEZvcm0uYWRkRXZlbnRMaXN0ZW5lciggXCJzdWJtaXRcIiwgKCBldmVudCApID0+IHtcblx0XHRcdFx0XHR0aGlzLm9uRm9ybVN1Ym1pdCggZXZlbnQgKTtcblx0XHRcdFx0fSApXG5cdFx0XHQpO1xuXG5cdFx0fSwgLy8gZW5kIGluaXRcblxuXHRcdCAvKlxuXHRcdCAgKiBydW4gYW4gYW5hbHl0aWNzIHByb2R1Y3QgYWN0aW9uXG5cdFx0ICovXG5cdFx0IGFuYWx5dGljc1Byb2R1Y3RBY3Rpb246IGZ1bmN0aW9uKCBsZXZlbCwgYW1vdW50LCBmcmVxdWVuY3lfbGFiZWwsIGFjdGlvbiwgc3RlcCApIHtcblx0XHRcdHZhciBwcm9kdWN0ID0gdGhpcy5hbmFseXRpY3NQcm9kdWN0KGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCApO1xuXHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oICdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFY29tbWVyY2VBY3Rpb24nLCAnZXZlbnQnLCBhY3Rpb24sIHByb2R1Y3QsIHN0ZXAgKTtcblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzUHJvZHVjdEFjdGlvblxuXG5cdFx0Lypcblx0XHQgICogY3JlYXRlIGFuIGFuYWx5dGljcyBwcm9kdWN0IHZhcmlhYmxlXG5cdFx0ICovXG5cdFx0YW5hbHl0aWNzUHJvZHVjdDogZnVuY3Rpb24oIGxldmVsLCBhbW91bnQsIGZyZXF1ZW5jeV9sYWJlbCApIHtcblx0XHRcdGxldCBwcm9kdWN0ID0ge1xuXHRcdFx0XHQnaWQnOiAnbWlubnBvc3RfJyArIGxldmVsLnRvTG93ZXJDYXNlKCkgKyAnX21lbWJlcnNoaXAnLFxuXHRcdFx0XHQnbmFtZSc6ICdNaW5uUG9zdCAnICsgbGV2ZWwuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBsZXZlbC5zbGljZSgxKSArICcgTWVtYmVyc2hpcCcsXG5cdFx0XHRcdCdjYXRlZ29yeSc6ICdEb25hdGlvbicsXG5cdFx0XHRcdCdicmFuZCc6ICdNaW5uUG9zdCcsXG5cdFx0XHRcdCd2YXJpYW50JzogIGZyZXF1ZW5jeV9sYWJlbCxcblx0XHRcdFx0J3ByaWNlJzogYW1vdW50LFxuXHRcdFx0XHQncXVhbnRpdHknOiAxXG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcHJvZHVjdDtcblx0XHR9LCAvLyBlbmQgYW5hbHl0aWNzUHJvZHVjdFxuXG5cdFx0b25GcmVxdWVuY3lDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMuc2V0QW1vdW50TGFiZWxzKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSApO1xuXHRcdFx0dGhpcy5zZXRNaW5BbW91bnRzKCAkKCBldmVudC50YXJnZXQgKS52YWwoKSApO1xuXHRcdFx0dGhpcy5jaGVja0FuZFNldExldmVsKCB0cnVlICk7XG5cdFx0fSwgLy8gZW5kIG9uRnJlcXVlbmN5Q2hhbmdlXG5cblx0XHRvblN1Z2dlc3RlZEFtb3VudENoYW5nZTogZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0JCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmFtb3VudEZpZWxkICkudmFsKCBudWxsICk7XG5cdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoIHRydWUpO1xuXHRcdH0sIC8vIGVuZCBvblN1Z2dlc3RlZEFtb3VudENoYW5nZVxuXG5cdFx0b25BbW91bnRDaGFuZ2U6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHRoaXMuY2xlYXJBbW91bnRTZWxlY3RvciggZXZlbnQgKTtcblxuXHRcdFx0dmFyICR0YXJnZXQgPSAkKCBldmVudC50YXJnZXQgKTtcblx0XHRcdGlmICggJHRhcmdldC5kYXRhKCAnbGFzdC12YWx1ZScgKSAhPSAkdGFyZ2V0LnZhbCgpICkge1xuXHRcdFx0XHQkdGFyZ2V0LmRhdGEoICdsYXN0LXZhbHVlJywgJHRhcmdldC52YWwoKSApO1xuXHRcdFx0XHR0aGlzLmNoZWNrQW5kU2V0TGV2ZWwoIHRydWUgKTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgb25BbW91bnRDaGFuZ2VcblxuXHRcdG9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgJGdpZnRTZWxlY3Rpb25Hcm91cCA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5naWZ0U2VsZWN0aW9uR3JvdXAgKTtcblx0XHRcdHZhciBkZWNsaW5lID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmRlY2xpbmVCZW5lZml0cyApLmZpbHRlciggJzpjaGVja2VkJyApLnZhbCgpO1xuXG5cdFx0XHRpZiAoIGRlY2xpbmUgPT09ICd0cnVlJyApIHtcblx0XHRcdFx0JGdpZnRTZWxlY3Rpb25Hcm91cC5oaWRlKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JGdpZnRTZWxlY3Rpb25Hcm91cC5zaG93KCk7XG5cdFx0fSwgLy8gZW5kIG9uRGVjbGluZUJlbmVmaXRzQ2hhbmdlXG5cblx0XHRvbkdpZnRMZXZlbENsaWNrOiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgJGdpZnRzID0gJCggdGhpcy5lbGVtZW50ICkuZmluZCggdGhpcy5vcHRpb25zLmdpZnRTZWxlY3RvciApLm5vdCggdGhpcy5vcHRpb25zLmRlY2xpbmVHaWZ0TGV2ZWwgKTtcblx0XHRcdHZhciAkZGVjbGluZSA9ICQoIHRoaXMuZWxlbWVudCApLmZpbmQoIHRoaXMub3B0aW9ucy5kZWNsaW5lR2lmdExldmVsICk7XG5cdFx0XHRpZiAoICQoIGV2ZW50LnRhcmdldCApLmlzKCB0aGlzLm9wdGlvbnMuZGVjbGluZUdpZnRMZXZlbCApICkge1xuXHRcdFx0XHQkZ2lmdHMucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRkZWNsaW5lLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHR9LCAvLyBlbmQgb25HaWZ0TGV2ZWxDbGlja1xuXG5cdFx0b25Gb3JtU3VibWl0OiBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHR2YXIgYW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yICkuZmlsdGVyKCAnOmNoZWNrZWQnICkudmFsKCk7XG5cdFx0XHRpZiAoIHR5cGVvZiBhbW91bnQgPT09ICd1bmRlZmluZWQnICkge1xuXHRcdFx0XHRhbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50RmllbGQgKS52YWwoKTtcblx0XHRcdH1cblx0XHRcdHZhciBmcmVxdWVuY3lfc3RyaW5nID0gJCggdGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICsgJzpjaGVja2VkJyApLnZhbCgpO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzFdO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMF07XG5cdFx0XHR2YXIgZnJlcXVlbmN5X2lkID0gJCggdGhpcy5vcHRpb25zLmZyZXF1ZW5jeVNlbGVjdG9yICsgJzpjaGVja2VkJyApLnByb3AoICdpZCcgKTtcblx0XHRcdHZhciBmcmVxdWVuY3lfbGFiZWwgPSAkKCAnbGFiZWxbZm9yPVwiJyArIGZyZXF1ZW5jeV9pZCArICdcIl0nICkudGV4dCgpO1xuXHRcdFx0dmFyIGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSApO1xuXG5cdFx0XHR2YXIgb3B0aW9ucyA9IHtcblx0XHRcdFx0dHlwZTogJ2V2ZW50Jyxcblx0XHRcdFx0Y2F0ZWdvcnk6ICdTdXBwb3J0IFVzJyxcblx0XHRcdFx0YWN0aW9uOiAnQmVjb21lIEEgTWVtYmVyJyxcblx0XHRcdFx0bGFiZWw6IGxvY2F0aW9uLnBhdGhuYW1lXG5cdFx0XHR9O1xuXHRcdFx0Ly8gdGhpcyB0cmFja3MgYW4gZXZlbnQgc3VibWlzc2lvbiBiYXNlZCBvbiB0aGUgcGx1Z2luIG9wdGlvbnNcblx0XHRcdC8vIGl0IGFsc28gYnViYmxlcyB0aGUgZXZlbnQgdXAgdG8gc3VibWl0IHRoZSBmb3JtXG5cdFx0XHR3cC5ob29rcy5kb0FjdGlvbihcblx0XHRcdFx0J21pbm5wb3N0TWVtYmVyc2hpcEFuYWx5dGljc0V2ZW50Jyxcblx0XHRcdFx0b3B0aW9ucy50eXBlLFxuXHRcdFx0XHRvcHRpb25zLmNhdGVnb3J5LFxuXHRcdFx0XHRvcHRpb25zLmFjdGlvbixcblx0XHRcdFx0b3B0aW9ucy5sYWJlbFxuXHRcdFx0KTtcblx0XHRcdHZhciBoYXNDbGFzcyA9IGV2ZW50LnRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoIFwibS1mb3JtLW1lbWJlcnNoaXAtc3VwcG9ydFwiICk7XG5cdFx0XHQvLyBpZiB0aGlzIGlzIHRoZSBtYWluIGNoZWNrb3V0IGZvcm0sIHNlbmQgaXQgdG8gdGhlIGVjIHBsdWdpbiBhcyBhIGNoZWNrb3V0XG5cdFx0XHRpZiAoIGhhc0NsYXNzICkge1xuXHRcdFx0XHR2YXIgcHJvZHVjdCA9IHRoaXMuYW5hbHl0aWNzUHJvZHVjdCggbGV2ZWxbJ25hbWUnXSwgYW1vdW50LCBmcmVxdWVuY3lfbGFiZWwgKTtcblx0XHRcdFx0d3AuaG9va3MuZG9BY3Rpb24oICdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFY29tbWVyY2VBY3Rpb24nLCAnZXZlbnQnLCAnYWRkX3RvX2NhcnQnLCBwcm9kdWN0ICk7XG5cdFx0XHRcdHdwLmhvb2tzLmRvQWN0aW9uKCAnbWlubnBvc3RNZW1iZXJzaGlwQW5hbHl0aWNzRWNvbW1lcmNlQWN0aW9uJywgJ2V2ZW50JywgJ2JlZ2luX2NoZWNrb3V0JywgcHJvZHVjdCApO1xuXHRcdFx0fVxuXHRcdH0sIC8vIGVuZCBvbkZvcm1TdWJtaXRcblxuXHRcdGNsZWFyQW1vdW50U2VsZWN0b3I6IGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdHZhciAkc3VnZ2VzdGVkQW1vdW50ID0gJCggdGhpcy5vcHRpb25zLmFtb3VudFNlbGVjdG9yICk7XG5cblx0XHRcdGlmICggJCggZXZlbnQudGFyZ2V0ICkudmFsKCkgPT09ICcnICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdCRzdWdnZXN0ZWRBbW91bnQucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdH0sIC8vIGVuZCBjbGVhckFtb3VudFNlbGVjdG9yXG5cblx0XHRzZXRBbW91bnRMYWJlbHM6IGZ1bmN0aW9uKCBmcmVxdWVuY3lTdHJpbmcgKSB7XG5cdFx0XHR2YXIgJGdyb3VwcyA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRHcm91cCApO1xuXHRcdFx0dmFyICRzZWxlY3RlZCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRTZWxlY3RvciApXG5cdFx0XHQgICAgLmZpbHRlciggJzpjaGVja2VkJyApO1xuXHRcdFx0dmFyIGluZGV4ID0gJHNlbGVjdGVkLmRhdGEoICdpbmRleCcgKTtcblx0XHRcdHZhciAkY3VzdG9tQW1vdW50RnJlcXVlbmN5ID0gJCggdGhpcy5vcHRpb25zLmN1c3RvbUFtb3VudEZyZXF1ZW5jeSApO1xuXG5cdFx0XHQkZ3JvdXBzLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0JGdyb3Vwcy5maWx0ZXIoICdbZGF0YS1mcmVxdWVuY3k9XCInICsgZnJlcXVlbmN5U3RyaW5nICsgJ1wiXScgKVxuXHRcdFx0XHQuYWRkQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQkc2VsZWN0ZWQucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdFx0JGdyb3Vwcy5maWx0ZXIoICcuYWN0aXZlJyApXG5cdFx0XHRcdC5maW5kKCAnaW5wdXRbdHlwZT1cInJhZGlvXCJdW2RhdGEtaW5kZXg9XCInICsgaW5kZXggKyAnXCJdJyApXG5cdFx0XHRcdC5wcm9wKCAnY2hlY2tlZCcsIHRydWUgKTtcblxuXHRcdFx0dmFyIGN1cnJlbnRGcmVxdWVuY3lMYWJlbCA9ICRncm91cHMuZmlsdGVyKCAnLmFjdGl2ZScgKS5maW5kKCcuYS1mcmVxdWVuY3ktdGV4dC1sYWJlbCcpLmZpcnN0KCkudGV4dCgpO1xuXHRcdFx0JGN1c3RvbUFtb3VudEZyZXF1ZW5jeS50ZXh0KCBjdXJyZW50RnJlcXVlbmN5TGFiZWwgKTtcblx0XHR9LCAvLyBlbmQgc2V0QW1vdW50TGFiZWxzXG5cblx0XHRzZXRNaW5BbW91bnRzOiBmdW5jdGlvbiggZnJlcXVlbmN5U3RyaW5nICkge1xuXHRcdFx0dmFyICRlbGVtZW50cyA9ICQoIHRoaXMub3B0aW9ucy5taW5BbW91bnRzICk7XG5cdFx0XHQkZWxlbWVudHMucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHQkZWxlbWVudHMuZmlsdGVyKCAnW2RhdGEtZnJlcXVlbmN5PVwiJyArIGZyZXF1ZW5jeVN0cmluZyArICdcIl0nIClcblx0XHRcdFx0LmFkZENsYXNzKCAnYWN0aXZlJyApO1xuXHRcdH0sIC8vIGVuZCBzZXRNaW5BbW91bnRzXG5cblx0XHRjaGVja0FuZFNldExldmVsOiBmdW5jdGlvbiggdXBkYXRlZCApIHtcblx0XHRcdHZhciBhbW91bnQgPSAkKCB0aGlzLm9wdGlvbnMuYW1vdW50U2VsZWN0b3IgKS5maWx0ZXIoICc6Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdGlmICggdHlwZW9mIGFtb3VudCA9PT0gJ3VuZGVmaW5lZCcgKSB7XG5cdFx0XHRcdGFtb3VudCA9ICQoIHRoaXMub3B0aW9ucy5hbW91bnRGaWVsZCApLnZhbCgpO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdHZhciBmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9pZCA9ICQoIHRoaXMub3B0aW9ucy5mcmVxdWVuY3lTZWxlY3RvciArICc6Y2hlY2tlZCcgKS5wcm9wKCAnaWQnICk7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X2xhYmVsID0gJCggJ2xhYmVsW2Zvcj1cIicgKyBmcmVxdWVuY3lfaWQgKyAnXCJdJyApLnRleHQoKTtcblxuXHRcdFx0dmFyIGxldmVsID0gTWlublBvc3RNZW1iZXJzaGlwLmNoZWNrTGV2ZWwoIGFtb3VudCwgZnJlcXVlbmN5LCBmcmVxdWVuY3lfbmFtZSApO1xuXHRcdFx0dGhpcy5zaG93TmV3TGV2ZWwoIHRoaXMuZWxlbWVudCwgdGhpcy5vcHRpb25zLCBsZXZlbCApO1xuXHRcdFx0dGhpcy5zZXRFbmFibGVkR2lmdHMoIGxldmVsICk7XG5cdFx0XHR0aGlzLmFuYWx5dGljc1Byb2R1Y3RBY3Rpb24oIGxldmVsWyduYW1lJ10sIGFtb3VudCwgZnJlcXVlbmN5X2xhYmVsLCAnc2VsZWN0X2NvbnRlbnQnLCAxICk7XG5cdFx0fSwgLy8gZW5kIGNoZWNrQW5kU2V0TGV2ZWxcblxuXHRcdHNob3dOZXdMZXZlbDogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMsIGxldmVsICkge1xuXHRcdFx0dmFyIG1lbWJlcl9sZXZlbF9wcmVmaXggPSAnJztcblx0XHRcdHZhciBvbGRfbGV2ZWwgPSAnJztcblx0XHRcdHZhciBsZXZlbFZpZXdlckNvbnRhaW5lciA9IG9wdGlvbnMubGV2ZWxWaWV3ZXI7IC8vIHRoaXMgc2hvdWxkIGNoYW5nZSB3aGVuIHdlIHJlcGxhY2UgdGhlIHRleHQsIGlmIHRoZXJlIGlzIGEgbGluayBpbnNpZGUgaXRcblx0XHRcdHZhciBkZWNvZGVIdG1sRW50aXR5ID0gZnVuY3Rpb24oIHN0ciApIHtcblx0XHRcdFx0cmV0dXJuIHN0ci5yZXBsYWNlKCAvJiMoXFxkKyk7L2csIGZ1bmN0aW9uKCBtYXRjaCwgZGVjICkge1xuXHRcdFx0XHRcdHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKCBkZWMgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9O1xuXHRcdFx0aWYgKCB0eXBlb2YgbWlubnBvc3RfbWVtYmVyc2hpcF9kYXRhICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0bWVtYmVyX2xldmVsX3ByZWZpeCA9IG1pbm5wb3N0X21lbWJlcnNoaXBfZGF0YS5tZW1iZXJfbGV2ZWxfcHJlZml4O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdCQob3B0aW9ucy5sZXZlbFZpZXdlcikucHJvcCggJ2NsYXNzJywgJ2Etc2hvdy1sZXZlbCBhLXNob3ctbGV2ZWwtJyArIGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApO1xuXG5cdFx0XHRcdGlmICggJCggb3B0aW9ucy51c2VyQ3VycmVudExldmVsICkubGVuZ3RoID4gMCAmJiBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5sZW5ndGggPiAwICkge1xuXG5cdFx0XHRcdFx0aWYgKCAnYScsICQoIG9wdGlvbnMubGV2ZWxWaWV3ZXIgKS5sZW5ndGggPiAwICkge1xuXHRcdFx0XHRcdFx0bGV2ZWxWaWV3ZXJDb250YWluZXIgPSBvcHRpb25zLmxldmVsVmlld2VyICsgJyBhJztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvbGRfbGV2ZWwgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX2RhdGEuY3VycmVudF91c2VyLm1lbWJlcl9sZXZlbC5yZXBsYWNlKCBtZW1iZXJfbGV2ZWxfcHJlZml4LCAnJyApO1xuXG5cdFx0XHRcdFx0aWYgKCBvbGRfbGV2ZWwgIT09IGxldmVsWyduYW1lJ10udG9Mb3dlckNhc2UoKSApIHtcblx0XHRcdFx0XHRcdCQoIGxldmVsVmlld2VyQ29udGFpbmVyICkuaHRtbCggZGVjb2RlSHRtbEVudGl0eSggJCggb3B0aW9ucy5sZXZlbFZpZXdlciApLmRhdGEoICdjaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JCggbGV2ZWxWaWV3ZXJDb250YWluZXIgKS5odG1sKCBkZWNvZGVIdG1sRW50aXR5KCAkKCBvcHRpb25zLmxldmVsVmlld2VyICkuZGF0YSggJ25vdC1jaGFuZ2VkJyApICkgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKG9wdGlvbnMubGV2ZWxOYW1lLCBvcHRpb25zLmxldmVsVmlld2VyKS50ZXh0KCBsZXZlbFsnbmFtZSddICk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIHNob3dOZXdMZXZlbFxuXG5cdFx0c2V0RW5hYmxlZEdpZnRzOiBmdW5jdGlvbiggbGV2ZWwgKSB7XG5cdFx0XHR2YXIgc2V0RW5hYmxlZCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCB0aGlzICkucHJvcCggJ2Rpc2FibGVkJywgbGV2ZWwueWVhcmx5QW1vdW50IDwgJCggdGhpcyApLmRhdGEoICdtaW5ZZWFybHlBbW91bnQnICkgKTtcblx0XHRcdH07XG5cblx0XHRcdCQoIHRoaXMub3B0aW9ucy5naWZ0U2VsZWN0b3IgKS5lYWNoKCBzZXRFbmFibGVkICk7XG5cblx0XHRcdGlmICggJCggdGhpcy5vcHRpb25zLnN3YWdTZWxlY3RvciApLm5vdCggJyNzd2FnLWRlY2xpbmUnICkuaXMoICc6ZW5hYmxlZCcgKSApIHtcblx0XHRcdFx0JCggJy5zd2FnLWRpc2FibGVkJyApLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHQkKCAnLnN3YWctZW5hYmxlZCcgKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoICcuc3dhZy1kaXNhYmxlZCcgKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0JCggJy5zd2FnLWVuYWJsZWQnICkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHR9XG5cdFx0fSwgLy8gZW5kIHNldEVuYWJsZWRHaWZ0c1xuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cblx0Ly8gQSByZWFsbHkgbGlnaHR3ZWlnaHQgcGx1Z2luIHdyYXBwZXIgYXJvdW5kIHRoZSBjb25zdHJ1Y3Rvcixcblx0Ly8gcHJldmVudGluZyBhZ2FpbnN0IG11bHRpcGxlIGluc3RhbnRpYXRpb25zXG5cdCQuZm5bcGx1Z2luTmFtZV0gPSBmdW5jdGlvbiAoIG9wdGlvbnMgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZWFjaChmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoICEgJC5kYXRhKCB0aGlzLCAncGx1Z2luXycgKyBwbHVnaW5OYW1lICkgKSB7XG5cdFx0XHRcdCQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSwgbmV3IFBsdWdpbiggdGhpcywgb3B0aW9ucyApICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXAgKTtcbiIsIiggZnVuY3Rpb24oICQgKSB7XG5cblx0ZnVuY3Rpb24gYmVuZWZpdEZvcm0oKSB7XG5cdFx0aWYgKCAyID09PSBwZXJmb3JtYW5jZS5uYXZpZ2F0aW9uLnR5cGUgKSB7XG5cdFx0XHRsb2NhdGlvbi5yZWxvYWQoIHRydWUgKTtcblx0XHR9XG5cdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uLmEtYnV0dG9uLWRpc2FibGVkJyApLnJlbW92ZUF0dHIoICdkaXNhYmxlZCcgKTtcblx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkuY2xpY2soIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR2YXIgJGJ1dHRvbiAgPSAkKCB0aGlzICk7XG5cdFx0XHR2YXIgJHN0YXR1cyAgPSAkKCAnLm0tYmVuZWZpdC1tZXNzYWdlJywgJCggdGhpcyApLnBhcmVudCgpICk7XG5cdFx0XHR2YXIgJHNlbGVjdCAgPSAkKCAnc2VsZWN0JywgJCggdGhpcyApLnBhcmVudCgpICk7XG5cdFx0XHR2YXIgc2V0dGluZ3MgPSBtaW5ucG9zdF9tZW1iZXJzaGlwX3NldHRpbmdzO1xuXHRcdFx0Ly8gcmVzZXQgdGhlIG1lc3NhZ2UgZm9yIGN1cnJlbnQgc3RhdHVzXG5cdFx0XHRpZiAoICEgJy5tLWJlbmVmaXQtbWVzc2FnZS1zdWNjZXNzJyApIHtcblx0XHRcdFx0JCggJy5tLWJlbmVmaXQtbWVzc2FnZScgKS5yZW1vdmVDbGFzcyggJ20tYmVuZWZpdC1tZXNzYWdlLXZpc2libGUgbS1iZW5lZml0LW1lc3NhZ2UtZXJyb3IgbS1iZW5lZml0LW1lc3NhZ2UtaW5mbycgKTtcblx0XHRcdH1cblx0XHRcdC8vIHNldCBidXR0b24gdG8gcHJvY2Vzc2luZ1xuXHRcdFx0JGJ1dHRvbi50ZXh0KCAnUHJvY2Vzc2luZycgKS5hZGRDbGFzcyggJ2EtYnV0dG9uLWRpc2FibGVkJyApO1xuXG5cdFx0XHQvLyBkaXNhYmxlIGFsbCB0aGUgb3RoZXIgYnV0dG9uc1xuXHRcdFx0JCggJy5hLWJlbmVmaXQtYnV0dG9uJyApLmFkZENsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICk7XG5cblx0XHRcdC8vIHNldCBhamF4IGRhdGFcblx0XHRcdHZhciBkYXRhID0ge307XG5cdFx0XHR2YXIgYmVuZWZpdFR5cGUgPSAkKCAnaW5wdXRbbmFtZT1cImJlbmVmaXQtbmFtZVwiXScgKS52YWwoKTtcblx0XHRcdGlmICggJ3BhcnRuZXItb2ZmZXJzJyA9PT0gYmVuZWZpdFR5cGUgKSB7XG5cdFx0XHRcdGRhdGEgPSB7XG5cdFx0XHRcdFx0J2FjdGlvbicgOiAnYmVuZWZpdF9mb3JtX3N1Ym1pdCcsXG5cdFx0XHRcdFx0J21pbm5wb3N0X21lbWJlcnNoaXBfYmVuZWZpdF9mb3JtX25vbmNlJyA6ICRidXR0b24uZGF0YSggJ2JlbmVmaXQtbm9uY2UnICksXG5cdFx0XHRcdFx0J2N1cnJlbnRfdXJsJyA6ICQoICdpbnB1dFtuYW1lPVwiY3VycmVudF91cmxcIl0nKS52YWwoKSxcblx0XHRcdFx0XHQnYmVuZWZpdC1uYW1lJzogJCggJ2lucHV0W25hbWU9XCJiZW5lZml0LW5hbWVcIl0nKS52YWwoKSxcblx0XHRcdFx0XHQnaW5zdGFuY2VfaWQnIDogJCggJ1tuYW1lPVwiaW5zdGFuY2UtaWQtJyArICRidXR0b24udmFsKCkgKyAnXCJdJyApLnZhbCgpLFxuXHRcdFx0XHRcdCdwb3N0X2lkJyA6ICRidXR0b24udmFsKCksXG5cdFx0XHRcdFx0J2lzX2FqYXgnIDogJzEnLFxuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdCQucG9zdCggc2V0dGluZ3MuYWpheHVybCwgZGF0YSwgZnVuY3Rpb24oIHJlc3BvbnNlICkge1xuXHRcdFx0XHRcdC8vIHN1Y2Nlc3Ncblx0XHRcdFx0XHRpZiAoIHRydWUgPT09IHJlc3BvbnNlLnN1Y2Nlc3MgKSB7XG5cdFx0XHRcdFx0XHQvL2NvbnNvbGUuZGlyKHJlc3BvbnNlKTtcblx0XHRcdFx0XHRcdCRidXR0b24udmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLnRleHQoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2xhYmVsICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKS5hZGRDbGFzcyggcmVzcG9uc2UuZGF0YS5idXR0b25fY2xhc3MgKS5wcm9wKCByZXNwb25zZS5kYXRhLmJ1dHRvbl9hdHRyLCB0cnVlICk7XG5cdFx0XHRcdFx0XHQkc3RhdHVzLmh0bWwoIHJlc3BvbnNlLmRhdGEubWVzc2FnZSApLmFkZENsYXNzKCAnbS1iZW5lZml0LW1lc3NhZ2UtdmlzaWJsZSAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlX2NsYXNzICk7XG5cdFx0XHRcdFx0XHRpZiAoIDAgPCAkc2VsZWN0Lmxlbmd0aCApIHtcblx0XHRcdFx0XHRcdFx0JHNlbGVjdC5wcm9wKCAnZGlzYWJsZWQnLCB0cnVlICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkubm90KCAkYnV0dG9uICkudmFsKCByZXNwb25zZS5kYXRhLmJ1dHRvbl92YWx1ZSApLmF0dHIoICdkaXNhYmxlZCcsIHRydWUgKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Ly8gZXJyb3Jcblx0XHRcdFx0XHRcdC8vY29uc29sZS5kaXIocmVzcG9uc2UpO1xuXHRcdFx0XHRcdFx0aWYgKCAndW5kZWZpbmVkJyA9PT0gdHlwZW9mIHJlc3BvbnNlLmRhdGEucmVtb3ZlX2luc3RhbmNlX3ZhbHVlICkge1xuXHRcdFx0XHRcdFx0XHRpZiAoICcnICE9PSByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLnNob3coKTtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uaGlkZSgpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHQkKCAnb3B0aW9uJywgJHNlbGVjdCApLmVhY2goIGZ1bmN0aW9uKCBpICkge1xuXHRcdFx0XHRcdFx0XHRcdGlmICggJCggdGhpcyApLnZhbCgpID09PSByZXNwb25zZS5kYXRhLnJlbW92ZV9pbnN0YW5jZV92YWx1ZSApIHtcblx0XHRcdFx0XHRcdFx0XHRcdCQoIHRoaXMgKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0XHRpZiAoICcnICE9PSByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApIHtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLnNob3coKTtcblx0XHRcdFx0XHRcdFx0XHQkYnV0dG9uLnZhbCggcmVzcG9uc2UuZGF0YS5idXR0b25fdmFsdWUgKS50ZXh0KCByZXNwb25zZS5kYXRhLmJ1dHRvbl9sYWJlbCApLnJlbW92ZUNsYXNzKCAnYS1idXR0b24tZGlzYWJsZWQnICkuYWRkQ2xhc3MoIHJlc3BvbnNlLmRhdGEuYnV0dG9uX2NsYXNzICkucHJvcCggcmVzcG9uc2UuZGF0YS5idXR0b25fYXR0ciwgdHJ1ZSApO1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdCRidXR0b24uaGlkZSgpO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvLyByZS1lbmFibGUgYWxsIHRoZSBvdGhlciBidXR0b25zXG5cdFx0XHRcdFx0XHQkKCAnLmEtYmVuZWZpdC1idXR0b24nICkubm90KCAkYnV0dG9uICkucmVtb3ZlQ2xhc3MoICdhLWJ1dHRvbi1kaXNhYmxlZCcgKTtcblx0XHRcdFx0XHRcdCRzdGF0dXMuaHRtbCggcmVzcG9uc2UuZGF0YS5tZXNzYWdlICkuYWRkQ2xhc3MoICdtLWJlbmVmaXQtbWVzc2FnZS12aXNpYmxlICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2VfY2xhc3MgKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cblxuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblx0XHRpZiAoIDAgPCAkKCAnLm0tZm9ybS1tZW1iZXJzaGlwLWJlbmVmaXQnICkubGVuZ3RoICkge1xuXHRcdFx0YmVuZWZpdEZvcm0oKTtcblx0XHR9XG5cdFx0JCggJy5hLXJlZnJlc2gtcGFnZScgKS5vbiggJ2NsaWNrJywgZnVuY3Rpb24gKCBldmVudCApIHtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRsb2NhdGlvbi5yZWxvYWQoKTtcblx0XHR9KTtcblx0fSk7XG5cbn0gKSggalF1ZXJ5ICk7XG4iLCJjb25zdCBidXR0b24gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCAnLm0tc3VwcG9ydC1jdGEtdG9wIC5hLXN1cHBvcnQtYnV0dG9uJyApO1xuaWYgKCBidXR0b24gKSB7XG5cdGJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCAnY2xpY2snLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0dmFyIHZhbHVlID0gJyc7XG5cdFx0Y29uc3Qgc3ZnID0gYnV0dG9uLnF1ZXJ5U2VsZWN0b3IoICdzdmcnICk7XG5cdFx0aWYgKCBudWxsICE9PSBzdmcgKSB7XG5cdFx0XHRsZXQgYXR0cmlidXRlID0gc3ZnLmdldEF0dHJpYnV0ZSggJ3RpdGxlJyApO1xuXHRcdFx0aWYgKCBudWxsICE9PSBhdHRyaWJ1dGUgKSB7XG5cdFx0XHRcdHZhbHVlID0gYXR0cmlidXRlICsgJyAnO1xuXHRcdFx0fVxuXHRcdH1cblx0XHR2YWx1ZSA9IHZhbHVlICsgYnV0dG9uLnRleHRDb250ZW50O1xuXHRcdHdwLmhvb2tzLmRvQWN0aW9uKCdtaW5ucG9zdE1lbWJlcnNoaXBBbmFseXRpY3NFdmVudCcsICdldmVudCcsICdTdXBwb3J0IENUQSAtIEhlYWRlcicsICdDbGljazogJyArIHZhbHVlLCBsb2NhdGlvbi5wYXRobmFtZSk7XG5cdH0pO1xufVxuIiwiLy8gcGx1Z2luXG47KGZ1bmN0aW9uICggJCwgd2luZG93LCBkb2N1bWVudCwgTWlublBvc3RNZW1iZXJzaGlwLCB1bmRlZmluZWQgKSB7XG5cblx0Ly8gQ3JlYXRlIHRoZSBkZWZhdWx0cyBvbmNlXG5cdHZhciBwbHVnaW5OYW1lID0gJ21pbm5wb3N0TWVtYmVyc2hpcCcsXG5cdGRlZmF1bHRzID0ge1xuXHRcdCdkZWJ1ZycgOiBmYWxzZSwgLy8gdGhpcyBjYW4gYmUgc2V0IHRvIHRydWUgb24gcGFnZSBsZXZlbCBvcHRpb25zXG5cdFx0J2Ftb3VudF92aWV3ZXInIDogJy5hbW91bnQgaDMnLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzJyA6ICcuYS1mb3JtLWl0ZW0tbWVtYmVyc2hpcC1mcmVxdWVuY3knLFxuXHRcdCdmcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzX3R5cGUnIDogJ3NlbGVjdCcsXG5cdFx0J2xldmVsc19jb250YWluZXInIDogJy5vLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVscycsXG5cdFx0J3NpbmdsZV9sZXZlbF9jb250YWluZXInIDogJy5tLW1lbWJlcnNoaXAtbWVtYmVyLWxldmVsJyxcblx0XHQnc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3InIDogJy5tLW1lbWJlci1sZXZlbC1icmllZicsXG5cdFx0J2ZsaXBwZWRfaXRlbXMnIDogJ2Rpdi5hbW91bnQsIGRpdi5lbnRlcicsXG5cdFx0J2xldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yJyA6ICcuc2hvdy1mcmVxdWVuY3knLFxuXHRcdCdjaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscycgOiAnLmFtb3VudCAuYS1idXR0b24tZmxpcCcsXG5cdFx0J2Ftb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMnIDogJy5lbnRlciBpbnB1dC5hbW91bnQtZW50cnknLFxuXHR9OyAvLyBlbmQgZGVmYXVsdHNcblxuXHQvLyBUaGUgYWN0dWFsIHBsdWdpbiBjb25zdHJ1Y3RvclxuXHRmdW5jdGlvbiBQbHVnaW4oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cblx0XHR0aGlzLmVsZW1lbnQgPSBlbGVtZW50O1xuXG5cdFx0Ly8galF1ZXJ5IGhhcyBhbiBleHRlbmQgbWV0aG9kIHdoaWNoIG1lcmdlcyB0aGUgY29udGVudHMgb2YgdHdvIG9yXG5cdFx0Ly8gbW9yZSBvYmplY3RzLCBzdG9yaW5nIHRoZSByZXN1bHQgaW4gdGhlIGZpcnN0IG9iamVjdC4gVGhlIGZpcnN0IG9iamVjdFxuXHRcdC8vIGlzIGdlbmVyYWxseSBlbXB0eSBhcyB3ZSBkb24ndCB3YW50IHRvIGFsdGVyIHRoZSBkZWZhdWx0IG9wdGlvbnMgZm9yXG5cdFx0Ly8gZnV0dXJlIGluc3RhbmNlcyBvZiB0aGUgcGx1Z2luXG5cdFx0dGhpcy5vcHRpb25zID0gJC5leHRlbmQoIHt9LCBkZWZhdWx0cywgb3B0aW9ucyApO1xuXG5cdFx0dGhpcy5fZGVmYXVsdHMgPSBkZWZhdWx0cztcblx0XHR0aGlzLl9uYW1lID0gcGx1Z2luTmFtZTtcblxuXHRcdHRoaXMuaW5pdCgpO1xuXHR9IC8vIGVuZCBjb25zdHJ1Y3RvclxuXG5cdFBsdWdpbi5wcm90b3R5cGUgPSB7XG5cblx0XHRpbml0OiBmdW5jdGlvbiggcmVzZXQsIGFtb3VudCApIHtcblx0XHRcdC8vIFBsYWNlIGluaXRpYWxpemF0aW9uIGxvZ2ljIGhlcmVcblx0XHRcdC8vIFlvdSBhbHJlYWR5IGhhdmUgYWNjZXNzIHRvIHRoZSBET00gZWxlbWVudCBhbmRcblx0XHRcdC8vIHRoZSBvcHRpb25zIHZpYSB0aGUgaW5zdGFuY2UsIGUuZy4gdGhpcy5lbGVtZW50XG5cdFx0XHQvLyBhbmQgdGhpcy5vcHRpb25zXG5cdFx0XHQvLyB5b3UgY2FuIGFkZCBtb3JlIGZ1bmN0aW9ucyBsaWtlIHRoZSBvbmUgYmVsb3cgYW5kXG5cdFx0XHQvLyBjYWxsIHRoZW0gbGlrZSBzbzogdGhpcy55b3VyT3RoZXJGdW5jdGlvbih0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucykuXG5cdFx0XHR0aGlzLmNhdGNoSGFzaExpbmtzKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyk7XG5cdFx0XHR0aGlzLmxldmVsRmxpcHBlciggdGhpcy5lbGVtZW50LCB0aGlzLm9wdGlvbnMgKTtcblx0XHRcdHRoaXMuc3RhcnRMZXZlbENsaWNrKCB0aGlzLmVsZW1lbnQsIHRoaXMub3B0aW9ucyApO1xuXHRcdH0sXG5cblx0XHRjYXRjaEhhc2hMaW5rczogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHQkKCdhW2hyZWYqPVwiI1wiXTpub3QoW2hyZWY9XCIjXCJdKScsIGVsZW1lbnQpLmNsaWNrKGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0dmFyIHRhcmdldCA9ICQoZS50YXJnZXQpO1xuXHRcdFx0XHRpZiAodGFyZ2V0LnBhcmVudCgnLmNvbW1lbnQtdGl0bGUnKS5sZW5ndGggPT0gMCAmJiBsb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgPT0gdGhpcy5wYXRobmFtZS5yZXBsYWNlKC9eXFwvLywnJykgJiYgbG9jYXRpb24uaG9zdG5hbWUgPT0gdGhpcy5ob3N0bmFtZSkge1xuXHRcdFx0XHRcdHZhciB0YXJnZXQgPSAkKHRoaXMuaGFzaCk7XG5cdFx0XHRcdFx0dGFyZ2V0ID0gdGFyZ2V0Lmxlbmd0aCA/IHRhcmdldCA6ICQoJ1tuYW1lPScgKyB0aGlzLmhhc2guc2xpY2UoMSkgKyddJyk7XG5cdFx0XHRcdFx0aWYgKHRhcmdldC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdCQoJ2h0bWwsYm9keScpLmFuaW1hdGUoe1xuXHRcdFx0XHRcdFx0XHRzY3JvbGxUb3A6IHRhcmdldC5vZmZzZXQoKS50b3Bcblx0XHRcdFx0XHRcdH0sIDEwMDApO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fSwgLy8gZW5kIGNhdGNoTGlua3NcblxuXHRcdGxldmVsRmxpcHBlcjogZnVuY3Rpb24oIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgdGhhdCA9IHRoaXM7XG5cdFx0XHR2YXIgYW1vdW50ID0gMDtcblx0XHRcdHZhciBsZXZlbCA9ICcnO1xuXHRcdFx0dmFyIGxldmVsX251bWJlciA9IDA7XG5cdFx0XHR2YXIgZnJlcXVlbmN5X3N0cmluZyA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeSA9ICcnO1xuXHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gJyc7XG5cblx0XHRcdGlmICggJCggb3B0aW9ucy5sZXZlbHNfY29udGFpbmVyICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCApLmVhY2goZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5mbGlwcGVkX2l0ZW1zLCAkKHRoaXMpICkud3JhcEFsbCggJzxkaXYgY2xhc3M9XCJmbGlwcGVyXCIvPicgKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHRcdFx0XHRsZXZlbF9udW1iZXIgPSAkKHRoaXMpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfc3RyaW5nID0gJCh0aGlzKS52YWwoKTtcblx0XHRcdFx0XHRmcmVxdWVuY3kgPSBmcmVxdWVuY3lfc3RyaW5nLnNwbGl0KCcgLSAnKVsxXTtcblx0XHRcdFx0XHRmcmVxdWVuY3lfbmFtZSA9IGZyZXF1ZW5jeV9zdHJpbmcuc3BsaXQoJyAtICcpWzBdO1xuXHRcdFx0XHRcdGlmICggdHlwZW9mIGxldmVsX251bWJlciAhPT0gJ3VuZGVmaW5lZCcgKSB7XG5cblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0XHQkKCBldmVudC50YXJnZXQgKS5jbG9zZXN0KCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yICkuYWRkQ2xhc3MoICdmbGlwcGVkJyApO1xuXG5cdFx0XHRcdFx0XHRpZiAoIGZyZXF1ZW5jeSA9PSAxICkge1xuXHRcdFx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkudmFsKCAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciArICctJyArIGxldmVsX251bWJlciApICkuZGF0YSgnZGVmYXVsdC15ZWFybHknICkgKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeSA9PSAxMiApIHtcblx0XHRcdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLnZhbCggJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIgKSApLmRhdGEoJ2RlZmF1bHQtbW9udGhseScgKSApO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMgKyAnW2RhdGEtbWVtYmVyLWxldmVsLW51bWJlcj1cIicgKyBsZXZlbF9udW1iZXIgKyAnXCJdJykudmFsKCk7XG5cblx0XHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRcdHRoYXQuY2hhbmdlRnJlcXVlbmN5KCBmcmVxdWVuY3lfc3RyaW5nLCBsZXZlbFsnbmFtZSddLCBlbGVtZW50LCBvcHRpb25zICk7XG5cblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAkKCBvcHRpb25zLmxldmVsX2ZyZXF1ZW5jeV90ZXh0X3NlbGVjdG9yICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0XHRcdCQob3B0aW9ucy5sZXZlbF9mcmVxdWVuY3lfdGV4dF9zZWxlY3RvciwgZWxlbWVudCkudGV4dChmcmVxdWVuY3lfbmFtZSk7XG5cdFx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJChvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykpLmRhdGEoJ21lbWJlci1sZXZlbC1udW1iZXInKTtcblx0XHRcdFx0XHRcdFx0aWYgKCB0eXBlb2YgbGV2ZWxfbnVtYmVyICE9PSAndW5kZWZpbmVkJyApIHtcblx0XHRcdFx0XHRcdFx0XHRhbW91bnQgPSAkKCBvcHRpb25zLmFtb3VudF9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS52YWwoKTtcblx0XHRcdFx0XHRcdFx0XHRsZXZlbCA9IHRoYXQuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIGZyZXF1ZW5jeV9uYW1lLCBlbGVtZW50LCBvcHRpb25zICk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHRoYXQuY2hhbmdlQW1vdW50UHJldmlldyggZnJlcXVlbmN5X3N0cmluZywgbGV2ZWxbJ25hbWUnXSwgZWxlbWVudCwgb3B0aW9ucyApO1xuXG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAkKCBvcHRpb25zLmNob29zZV9hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICkubGVuZ3RoID4gMCApIHtcblx0XHRcdFx0JCggb3B0aW9ucy5jaG9vc2VfYW1vdW50X3NlbGVjdG9yX2luX2xldmVscywgZWxlbWVudCApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRcdFx0bGV2ZWxfbnVtYmVyID0gJCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCBlbGVtZW50ICkuZGF0YSgnbWVtYmVyLWxldmVsLW51bWJlcicpO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRcdCQoIGV2ZW50LnRhcmdldCApLmNsb3Nlc3QoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5hZGRDbGFzcyggJ2ZsaXBwZWQnICk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5X3N0cmluZyA9ICQob3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzLCAkKHRoaXMpLnBhcmVudCgpICkudmFsKCk7XG5cdFx0XHRcdFx0ZnJlcXVlbmN5ID0gZnJlcXVlbmN5X3N0cmluZy5zcGxpdCgnIC0gJylbMV07XG5cdFx0XHRcdFx0YW1vdW50ID0gJCggb3B0aW9ucy5hbW91bnRfc2VsZWN0b3JfaW5fbGV2ZWxzICsgJ1tkYXRhLW1lbWJlci1sZXZlbC1udW1iZXI9XCInICsgbGV2ZWxfbnVtYmVyICsgJ1wiXScpLnZhbCgpO1xuXHRcdFx0XHRcdGxldmVsID0gdGhhdC5jaGVja0xldmVsKCBhbW91bnQsIGZyZXF1ZW5jeSwgZnJlcXVlbmN5X25hbWUsIGVsZW1lbnQsIG9wdGlvbnMgKTtcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHR9LCAvLyBlbmQgbGV2ZWxGbGlwcGVyXG5cblx0XHRjaGVja0xldmVsOiBmdW5jdGlvbiggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUsIGVsZW1lbnQsIG9wdGlvbnMgKSB7XG5cdFx0XHR2YXIgbGV2ZWwgPSBNaW5uUG9zdE1lbWJlcnNoaXAuY2hlY2tMZXZlbCggYW1vdW50LCBmcmVxdWVuY3ksIHR5cGUgKTtcblxuXHRcdFx0JCgnaDInLCBvcHRpb25zLnNpbmdsZV9sZXZlbF9zdW1tYXJ5X3NlbGVjdG9yKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0aWYgKCAkKHRoaXMpLnRleHQoKSA9PSBsZXZlbFsnbmFtZSddICkge1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX2NvbnRhaW5lciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdhY3RpdmUnICk7XG5cdFx0XHRcdFx0JCh0aGlzKS5wYXJlbnQoKS5wYXJlbnQoKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXG5cdFx0XHRyZXR1cm4gbGV2ZWw7XG5cdFx0fSwgLy8gZW5kIGNoZWNrTGV2ZWxcblxuXHRcdGNoYW5nZUZyZXF1ZW5jeTogZnVuY3Rpb24oIHNlbGVjdGVkLCBsZXZlbCwgZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoIG9wdGlvbnMuc2luZ2xlX2xldmVsX3N1bW1hcnlfc2VsZWN0b3IgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0dmFyIHJhbmdlICAgICAgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkudGV4dCgpO1xuXHRcdFx0XHR2YXIgbW9udGhfdmFsdWUgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCdtb250aCcpO1xuXHRcdFx0XHR2YXIgeWVhcl92YWx1ZSAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5kYXRhKCd5ZWFyJyk7XG5cdFx0XHRcdHZhciBvbmNlX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ29uZS10aW1lJyk7XG5cdFx0XHRcdHZhciBmcmVxdWVuY3lfbmFtZSA9IHNlbGVjdGVkLnNwbGl0KCcgLSAnKVswXTtcblx0XHRcdFx0dmFyIGZyZXF1ZW5jeSAgICAgID0gcGFyc2VJbnQoIHNlbGVjdGVkLnNwbGl0KCcgLSAnKVsxXSApO1xuXG5cdFx0XHRcdCQoIG9wdGlvbnMuZnJlcXVlbmN5X3NlbGVjdG9yX2luX2xldmVscyApLnZhbCggc2VsZWN0ZWQgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5mcmVxdWVuY3lfc2VsZWN0b3JfaW5fbGV2ZWxzICkucHJvcCggJ3NlbGVjdGVkJywgc2VsZWN0ZWQgKTtcblxuXHRcdFx0XHRpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgbW9udGgnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gbW9udGhfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkucmVtb3ZlQ2xhc3MoICdzbWFsbGVyJyApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCBmcmVxdWVuY3lfbmFtZSA9PSAncGVyIHllYXInICkge1xuXHRcdFx0XHRcdHJhbmdlID0geWVhcl92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoZnJlcXVlbmN5X25hbWUgPT0gJ29uZS10aW1lJyApIHtcblx0XHRcdFx0XHRyYW5nZSA9IG9uY2VfdmFsdWU7XG5cdFx0XHRcdFx0JCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuYWRkQ2xhc3MoJ3NtYWxsZXInICk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCByYW5nZSApO1xuXHRcdFx0XHQkKCBvcHRpb25zLmZyZXF1ZW5jeV9zZWxlY3Rvcl9pbl9sZXZlbHMsICQodGhpcykgKS5kYXRhKCAnZnJlcXVlbmN5JywgZnJlcXVlbmN5ICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlRnJlcXVlbmN5XG5cblx0XHRjaGFuZ2VBbW91bnRQcmV2aWV3OiBmdW5jdGlvbiggc2VsZWN0ZWQsIGxldmVsLCBlbGVtZW50LCBvcHRpb25zICkge1xuXHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgcmFuZ2UgICAgICAgICAgPSAkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS50ZXh0KCk7XG5cdFx0XHRcdHZhciBtb250aF92YWx1ZSAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ21vbnRoJyk7XG5cdFx0XHRcdHZhciB5ZWFyX3ZhbHVlICAgICA9ICQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmRhdGEoJ3llYXInKTtcblx0XHRcdFx0dmFyIG9uY2VfdmFsdWUgICAgID0gJCggb3B0aW9ucy5hbW91bnRfdmlld2VyLCAkKHRoaXMpICkuZGF0YSgnb25lLXRpbWUnKTtcblx0XHRcdFx0dmFyIGZyZXF1ZW5jeV9uYW1lID0gc2VsZWN0ZWQuc3BsaXQoJyAtICcpWzBdO1xuXG5cdFx0XHRcdGlmICggZnJlcXVlbmN5X25hbWUgPT0gJ3BlciBtb250aCcgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSBtb250aF92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5yZW1vdmVDbGFzcyggJ3NtYWxsZXInICk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoIGZyZXF1ZW5jeV9uYW1lID09ICdwZXIgeWVhcicgKSB7XG5cdFx0XHRcdFx0cmFuZ2UgPSB5ZWFyX3ZhbHVlO1xuXHRcdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLmFkZENsYXNzKCAnc21hbGxlcicgKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmcmVxdWVuY3lfbmFtZSA9PSAnb25lLXRpbWUnICkge1xuXHRcdFx0XHRcdHJhbmdlID0gb25jZV92YWx1ZTtcblx0XHRcdFx0XHQkKCBvcHRpb25zLmFtb3VudF92aWV3ZXIsICQodGhpcykgKS5hZGRDbGFzcygnc21hbGxlcicgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdCQoIG9wdGlvbnMuYW1vdW50X3ZpZXdlciwgJCh0aGlzKSApLnRleHQoIHJhbmdlICk7XG5cblx0XHRcdH0gKTtcblx0XHR9LCAvLyBlbmQgY2hhbmdlQW1vdW50UHJldmlld1xuXG5cdFx0c3RhcnRMZXZlbENsaWNrOiBmdW5jdGlvbiggZWxlbWVudCwgb3B0aW9ucyApIHtcblx0XHRcdCQoJy5zdGFydC1sZXZlbCcpLmNsaWNrKGZ1bmN0aW9uKCkge1xuXHRcdFx0XHR2YXIgbGV2ZWxfY2xhc3MgPSAkKCB0aGlzICkucHJvcCggJ2NsYXNzJyApO1xuXHRcdFx0XHR2YXIgbGV2ZWxfbnVtYmVyID0gbGV2ZWxfY2xhc3NbbGV2ZWxfY2xhc3MubGVuZ3RoIC0xXTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciwgZWxlbWVudCkucmVtb3ZlQ2xhc3MoICdmbGlwcGVkJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIsIGVsZW1lbnQpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHQkKCBvcHRpb25zLnNpbmdsZV9sZXZlbF9jb250YWluZXIgKyAnLScgKyBsZXZlbF9udW1iZXIsIGVsZW1lbnQgKS5hZGRDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0JCggb3B0aW9ucy5zaW5nbGVfbGV2ZWxfY29udGFpbmVyICsgJy0nICsgbGV2ZWxfbnVtYmVyICsgJyAnICsgb3B0aW9ucy5zaW5nbGVfbGV2ZWxfc3VtbWFyeV9zZWxlY3RvciApLmFkZENsYXNzKCAnZmxpcHBlZCcgKTtcblx0XHRcdH0pO1xuXHRcdH0sIC8vIGVuZCBzdGFydExldmVsQ2xpY2tcblxuXHR9OyAvLyBlbmQgUGx1Z2luLnByb3RvdHlwZVxuXG5cdC8vIEEgcmVhbGx5IGxpZ2h0d2VpZ2h0IHBsdWdpbiB3cmFwcGVyIGFyb3VuZCB0aGUgY29uc3RydWN0b3IsXG5cdC8vIHByZXZlbnRpbmcgYWdhaW5zdCBtdWx0aXBsZSBpbnN0YW50aWF0aW9uc1xuXHQkLmZuW3BsdWdpbk5hbWVdID0gZnVuY3Rpb24gKCBvcHRpb25zICkge1xuXHRcdHJldHVybiB0aGlzLmVhY2goZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKCAhICQuZGF0YSggdGhpcywgJ3BsdWdpbl8nICsgcGx1Z2luTmFtZSApICkge1xuXHRcdFx0XHQkLmRhdGEoIHRoaXMsICdwbHVnaW5fJyArIHBsdWdpbk5hbWUsIG5ldyBQbHVnaW4oIHRoaXMsIG9wdGlvbnMgKSApO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9O1xuXG59KSggalF1ZXJ5LCB3aW5kb3csIGRvY3VtZW50LCBNaW5uUG9zdE1lbWJlcnNoaXAgKTtcbiJdfQ==
}(jQuery));
