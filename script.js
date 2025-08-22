document.addEventListener('DOMContentLoaded', function() {
  // Main elements
  const registrationForm = document.getElementById('registration-form');
  const registrationStatus = document.getElementById('registration-status');
  const registrationSection = document.getElementById('registration-section');
  const questionnaireSection = document.getElementById('questionnaire-section');
  const questionnaireForm = document.getElementById('questionnaire-form');
  const questionnaireStatus = document.getElementById('questionnaire-status');
  
  // Track submission state
  let isSubmitting = false;
  
  // Correct answers will be fetched from database
  let correctAnswers = {};
  
  // Utility functions
  function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status ${type || ''}`;
    
    // Ensure the status message is visible (scroll to it if needed)
    if (type === 'error') {
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }
  
  function disableForm(form, disable = true) {
    Array.from(form.elements).forEach(element => {
      element.disabled = disable;
    });
  }
  
  async function sendRequest(url, data) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      // Parse response as JSON
      const result = await response.json();
      
      // Handle non-2xx responses
      if (!response.ok) {
        const errorMessage = result.error || result.details || `Server responded with status ${response.status}`;
        throw new Error(errorMessage);
      }
      
      return result;
    } catch (error) {
      // Re-throw network or parsing errors
      throw error;
    }
  }
  
  // Fetch correct answers from database
  async function fetchCorrectAnswers() {
    try {
      const response = await fetch('/.netlify/functions/get-correct-answers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch correct answers: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Transform the database results into the expected format
      // Database returns: [{id: 1, question_id: 1, correct_answer: "server"}, ...]
      // We need: {question1: ["server"], question2: ["souvenir"], ...}
      const transformedAnswers = {};
      
      result.forEach(item => {
        const questionKey = `question${item.question_id}`;
        if (!transformedAnswers[questionKey]) {
          transformedAnswers[questionKey] = [];
        }
        transformedAnswers[questionKey].push(item.correct_answer);
      });
      
      return transformedAnswers;
    } catch (error) {
      console.error('Error fetching correct answers:', error);
      throw error;
    }
  }
  
  // Check if answer is correct (case-insensitive, trimmed comparison)
  function isAnswerCorrect(questionId, userAnswer) {
    const possibleAnswers = correctAnswers[questionId] || [];
    
    // If no correct answers are defined, consider it incorrect
    if (possibleAnswers.length === 0) return false;
    
    // Normalize the user answer (trim and lowercase)
    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
    
    // Check if the normalized user answer matches any of the possible correct answers
    return possibleAnswers.some(correctAnswer => 
      normalizedUserAnswer === correctAnswer.trim().toLowerCase()
    );
  }
  
  // Calculate score from user answers
  function calculateScore(answers) {
    let score = 0;
    
    for (const questionId in answers) {
      if (isAnswerCorrect(questionId, answers[questionId])) {
        score++;
      }
    }
    
    return score;
  }

  // Display detailed results showing correct/incorrect words
  function displayDetailedResults(answers, score) {
    const resultsContainer = document.getElementById('detailed-results');
    if (!resultsContainer) return;
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    // Create results header
    const resultsHeader = document.createElement('h2');
    resultsHeader.textContent = 'Detailed Results';
    resultsHeader.className = 'results-header';
    resultsContainer.appendChild(resultsHeader);
    
    // Create results list
    const resultsList = document.createElement('div');
    resultsList.className = 'results-list';
    
    // Process each question
    for (let i = 1; i <= 10; i++) {
      const questionId = `question${i}`;
      const userAnswer = answers[questionId] || '';
      const isCorrect = isAnswerCorrect(questionId, userAnswer);
      const correctAnswer = correctAnswers[questionId] ? correctAnswers[questionId][0] : '';
      
      const resultItem = document.createElement('div');
      resultItem.className = `result-item ${isCorrect ? 'correct' : 'incorrect'}`;
      
      const questionLabel = document.createElement('span');
      questionLabel.className = 'question-label';
      questionLabel.textContent = `Word ${i}:`;
      
      const userAnswerSpan = document.createElement('span');
      userAnswerSpan.className = 'user-answer';
      userAnswerSpan.textContent = userAnswer || '(no answer)';
      
      const correctAnswerSpan = document.createElement('span');
      correctAnswerSpan.className = 'correct-answer';
      correctAnswerSpan.textContent = correctAnswer;
      
      resultItem.appendChild(questionLabel);
      resultItem.appendChild(userAnswerSpan);
      
      // Only show correct answer for incorrect responses
      if (!isCorrect) {
        resultItem.appendChild(correctAnswerSpan);
      }
      
      resultsList.appendChild(resultItem);
    }
    
    resultsContainer.appendChild(resultsList);
  }
  
  // Handle registration form submission
  if (registrationForm) {
    registrationForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      
      // Prevent double submission
      if (isSubmitting) return;
      
      // Get form values
      const nickname = document.getElementById('nickname').value.trim();
      const number = document.getElementById('number').value.trim();
      
      // Validate all fields are filled
      if (!nickname || !number) {
        showStatus(registrationStatus, "Please fill in all fields", "error");
        
        // Highlight empty fields
        if (!nickname) document.getElementById('nickname').classList.add('error-field');
        if (!number) document.getElementById('number').classList.add('error-field');
        
        return;
      }
      
      // Clear any previous validation styling
      document.getElementById('nickname').classList.remove('error-field');
      document.getElementById('number').classList.remove('error-field');
      
      // Set submitting state
      isSubmitting = true;
      disableForm(registrationForm, true);
      showStatus(registrationStatus, "Submitting...");
      
      try {
        console.log('Submitting registration:', { nickname, number });
        
        // Submit registration data
        const result = await sendRequest("/.netlify/functions/submit-registration", { 
          nickname: nickname,
          number: number
        });
        
        console.log('Registration successful:', result);
        
        // Store registration ID
        localStorage.setItem('registrationId', result.id);
        // Also store nickname for use in the submission complete message
        localStorage.setItem('userNickname', nickname);
        
        // Show success message
        showStatus(registrationStatus, "Good luck", "success");
        
        // Transition to questionnaire with animation
        setTimeout(function() {
          registrationSection.style.opacity = '0';
          registrationSection.style.transform = 'translateY(-20px)';
          
          setTimeout(function() {
            registrationSection.style.display = 'none';
            questionnaireSection.style.display = 'block';
            
            // Trigger a reflow before setting the opacity to ensure animation works
            void questionnaireSection.offsetWidth;
            
            questionnaireSection.style.opacity = '1';
            questionnaireSection.style.transform = 'translateY(0)';
            
            // Save form data after transition
            saveFormData();
          }, 300);
        }, 1000);
        
      } catch (error) {
        console.error("Registration error:", error);
        showStatus(registrationStatus, error.message || "Error submitting form. Please try again.", "error");
        disableForm(registrationForm, false);
      } finally {
        isSubmitting = false;
      }
    });
    
    // Add input event listeners to clear error styling on input
    ['nickname', 'number'].forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', function() {
          this.classList.remove('error-field');
          if (registrationStatus.classList.contains('error')) {
            registrationStatus.textContent = '';
            registrationStatus.className = 'status';
          }
          // Save form data as user types
          saveFormData();
        });
      }
    });
  }
  
  // Handle questionnaire form submission
  if (questionnaireForm) {
    // Initial setup
    questionnaireSection.style.opacity = '0';
    questionnaireSection.style.transform = 'translateY(20px)';
    
    // Add validation for all question fields
    for (let i = 1; i <= 10; i++) {
      const questionField = document.getElementById(`question${i}`);
      if (questionField) {
        // Clear error styling on input
        questionField.addEventListener('input', function() {
          this.classList.remove('error-field');
          // Save form data as user types
          saveFormData();
        });
      }
    }
    
         questionnaireForm.addEventListener('submit', async function(event) {
       event.preventDefault();
       
       // Prevent double submission
       if (isSubmitting) return;
       
       // Check if correct answers are loaded
       if (Object.keys(correctAnswers).length === 0) {
         showStatus(questionnaireStatus, "Quiz data not loaded. Please refresh the page.", "error");
         return;
       }
       
       // Check if all questions are answered
       const answers = {};
       const answersList = [];
       let allAnswered = true;
       let firstEmptyField = null;
      
      // Validate each question field
      for (let i = 1; i <= 10; i++) {
        const questionId = `question${i}`;
        const questionField = document.getElementById(questionId);
        if (!questionField) continue;
        
        const answer = questionField.value.trim();
        questionField.classList.remove('error-field');
        
        if (!answer) {
          allAnswered = false;
          questionField.classList.add('error-field');
          
          if (!firstEmptyField) {
            firstEmptyField = questionField;
          }
        } else {
          // Store answer both in object (for score calculation) and list (for API)
          answers[questionId] = answer;
          answersList.push({
            question: `Question ${i}`,
            answer: answer
          });
        }
      }
      
      // Show error if not all questions answered
      if (!allAnswered) {
        showStatus(questionnaireStatus, "Please answer all questions", "error");
        
        // Focus on first empty field
        if (firstEmptyField) {
          firstEmptyField.focus();
        }
        
        return;
      }
      
      // Set submitting state
      isSubmitting = true;
      disableForm(questionnaireForm, true);
      showStatus(questionnaireStatus, "Submitting...");
      
      try {
        // Get registration ID
        const registrationId = localStorage.getItem('registrationId');
        
        if (!registrationId) {
          throw new Error("Registration information missing. Please start over.");
        }
        
        console.log('Submitting questionnaire:', { registrationId, answerCount: answersList.length });
        
        // Calculate the score
        const score = calculateScore(answers);
        console.log('Score calculated:', score);
        
        // Submit questionnaire data with score
        const result = await sendRequest("/.netlify/functions/submit-questionnaire", { 
          registrationId: registrationId,
          answers: answersList,
          score: score
        });
        
        console.log('Questionnaire submission successful:', result);
        
        // Get the user's nickname from localStorage
        const nickname = localStorage.getItem('userNickname') || 'User';
        
        // Populate the score display
        const scoreDisplay = document.getElementById('score-display');
        const scoreClass = score >= 7 ? 'high-score' : (score >= 4 ? 'medium-score' : 'low-score');
        scoreDisplay.className = `score-container ${scoreClass}`;
        scoreDisplay.innerHTML = `
          <div class="score-title">Quiz Results</div>
          <div class="score-value">${score} out of 10</div>
          <div class="score-name">${nickname}</div>
        `;
        
        // Populate detailed results
        displayDetailedResults(answers, score);
        
        // Clear saved form data since test is complete
        clearSavedData();
        
        // Hide questionnaire and show results
        questionnaireSection.style.opacity = '0';
        questionnaireSection.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
          questionnaireSection.style.display = 'none';
          const resultsSection = document.getElementById('results-section');
          resultsSection.style.display = 'block';
          
          // Trigger a reflow before setting the opacity to ensure animation works
          void resultsSection.offsetWidth;
          
          resultsSection.style.opacity = '1';
          resultsSection.style.transform = 'translateY(0)';
          
          // Save form data after transition
          saveFormData();
        }, 300);
        
      } catch (error) {
        console.error("Questionnaire error:", error);
        showStatus(questionnaireStatus, error.message || "Error submitting questionnaire. Please try again.", "error");
        disableForm(questionnaireForm, false);
      } finally {
        isSubmitting = false;
      }
    });
  }
  
  // Initialize page
  async function init() {
    // Add dynamic styles
    if (!document.getElementById('dynamic-styles')) {
      const style = document.createElement('style');
      style.id = 'dynamic-styles';
      style.textContent = `
        .error-field {
          border-color: #dc3545 !important;
          background-color: #fff8f8 !important;
        }
        .error-field:focus {
          box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25) !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-20px); }
        }
        #questionnaire-section, #registration-section, #results-section {
          transition: opacity 0.3s ease-out, transform 0.3s ease-out;
        }
        .status.info {
          background-color: #cff4fc;
          color: #055160;
          border-left: 4px solid #0dcaf0;
        }
        #results-section {
          opacity: 0;
          transform: translateY(20px);
        }
        .score-container {
          padding: 25px;
          margin: 0 0 20px 0;
          text-align: center;
          border-radius: 8px;
          border: 2px solid;
        }
        .score-title {
          font-size: 1.5rem;
          margin-bottom: 15px;
          font-weight: bold;
        }
        .score-value {
          font-size: 2.5rem;
          margin-bottom: 10px;
          font-weight: bold;
        }
        .score-name {
          font-size: 1.1rem;
          font-style: italic;
        }
        .high-score {
          background-color: #d4edda;
          color: #155724;
          border-color: #28a745;
        }
        .medium-score {
          background-color: #fff3cd;
          color: #856404;
          border-color: #ffc107;
        }
        .low-score {
          background-color: #f8d7da;
          color: #721c24;
          border-color: #dc3545;
        }
        .loading {
          text-align: center;
          padding: 20px;
          color: #666;
        }
        .retry-button {
          background-color: #007bff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          margin-left: 10px;
          font-size: 14px;
        }
        .retry-button:hover {
          background-color: #0056b3;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Show loading state
    const registrationStatus = document.getElementById('registration-status');
    if (registrationStatus) {
      showStatus(registrationStatus, "Loading quiz...", "info");
    }
    
    try {
      // Fetch correct answers from database
      console.log('Fetching correct answers from database...');
      correctAnswers = await fetchCorrectAnswers();
      console.log('Correct answers loaded:', correctAnswers);
      
      // Clear loading message
      if (registrationStatus) {
        registrationStatus.textContent = '';
        registrationStatus.className = 'status';
      }
    } catch (error) {
      console.error('Failed to load correct answers:', error);
      // Show error message to user with retry option
      if (registrationStatus) {
        showStatus(registrationStatus, "Failed to load quiz data. Please refresh the page.", "error");
        
        // Add retry button
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Retry';
        retryButton.className = 'retry-button';
        retryButton.onclick = () => {
          showStatus(registrationStatus, "Retrying...", "info");
          setTimeout(() => init(), 1000);
        };
        registrationStatus.appendChild(retryButton);
      }
      return; // Don't proceed if we can't load correct answers
    }
    
    // Check if this is a fresh visit or a reload with existing data
    checkAndClearStorage();
    
    // Restore saved data and position on page load
    restoreSavedData();
  }
  
  // Save form data to localStorage
  function saveFormData() {
    const formData = {
      // Save registration data
      nickname: document.getElementById('nickname')?.value || '',
      number: document.getElementById('number')?.value || '',
      
      // Save questionnaire answers
      answers: {}
    };
    
    // Save all questionnaire answers
    for (let i = 1; i <= 10; i++) {
      const questionField = document.getElementById(`question${i}`);
      if (questionField) {
        formData.answers[`question${i}`] = questionField.value || '';
      }
    }
    
    // Save current section
    if (registrationSection.style.display !== 'none') {
      formData.currentSection = 'registration';
    } else if (questionnaireSection.style.display !== 'none') {
      formData.currentSection = 'questionnaire';
    } else if (document.getElementById('results-section').style.display !== 'none') {
      formData.currentSection = 'results';
    }
    
    localStorage.setItem('vocabularyTestFormData', JSON.stringify(formData));
  }
  
  // Restore saved data from localStorage
  function restoreSavedData() {
    const savedData = localStorage.getItem('vocabularyTestFormData');
    if (!savedData) return;
    
    try {
      const formData = JSON.parse(savedData);
      
      // Safety check: ensure we have registration data before proceeding
      const hasRegistrationData = localStorage.getItem('registrationId') && localStorage.getItem('userNickname');
      if (!hasRegistrationData && formData.currentSection === 'questionnaire') {
        // We're trying to restore questionnaire state but have no registration data
        // This is a corrupted state - clear everything and start fresh
        console.log('Safety check: No registration data found for questionnaire state. Clearing localStorage.');
        localStorage.removeItem('vocabularyTestFormData');
        localStorage.removeItem('registrationId');
        localStorage.removeItem('userNickname');
        return;
      }
      
      // Restore registration data
      if (formData.nickname) {
        const nicknameField = document.getElementById('nickname');
        if (nicknameField) nicknameField.value = formData.nickname;
      }
      
      if (formData.number) {
        const numberField = document.getElementById('number');
        if (numberField) numberField.value = formData.number;
      }
      
      // Restore questionnaire answers
      if (formData.answers) {
        for (let i = 1; i <= 10; i++) {
          const questionField = document.getElementById(`question${i}`);
          if (questionField && formData.answers[`question${i}`]) {
            questionField.value = formData.answers[`question${i}`];
          }
        }
      }
      
      // Restore position based on saved section
      if (formData.currentSection === 'questionnaire' && formData.nickname && formData.number && hasRegistrationData) {
        // User was on questionnaire, show it (only if we have all required data)
        registrationSection.style.display = 'none';
        questionnaireSection.style.display = 'block';
        questionnaireSection.style.opacity = '1';
        questionnaireSection.style.transform = 'translateY(0)';
      } else if (formData.currentSection === 'results') {
        // User was on results, but we can't restore the actual results
        // Redirect them back to questionnaire if they have data, otherwise to registration
        if (formData.nickname && formData.number && hasRegistrationData) {
          registrationSection.style.display = 'none';
          questionnaireSection.style.display = 'block';
          questionnaireSection.style.opacity = '1';
          questionnaireSection.style.transform = 'translateY(0)';
        } else {
          // No registration data, go back to registration
          registrationSection.style.display = 'block';
          questionnaireSection.style.display = 'none';
        }
      }
      
    } catch (error) {
      console.error('Error restoring saved data:', error);
      // Clear corrupted data
      localStorage.removeItem('vocabularyTestFormData');
    }
  }
  
  // Check if this is a fresh visit or a reload with existing data
  function checkAndClearStorage() {
    // Check if there's any existing data
    const hasExistingData = localStorage.getItem('vocabularyTestFormData') || 
                           localStorage.getItem('registrationId') || 
                           localStorage.getItem('userNickname');
    
    // Use a more reliable method to detect fresh visits
    // Check if we have a timestamp from last visit
    const lastVisitTime = localStorage.getItem('lastVisitTime');
    const currentTime = Date.now();
    const isFreshVisit = !lastVisitTime || (currentTime - parseInt(lastVisitTime)) > 300000; // 5 minutes
    
    if (isFreshVisit && !hasExistingData) {
      // This is a completely fresh visit - clear everything
      localStorage.removeItem('vocabularyTestFormData');
      localStorage.removeItem('registrationId');
      localStorage.removeItem('userNickname');
      
      // Set visit timestamp
      localStorage.setItem('lastVisitTime', currentTime.toString());
    } else if (isFreshVisit && hasExistingData) {
      // This is a fresh visit but there's existing data from a previous session
      // Check if we have a corrupted state (questionnaire data without registration data)
      const hasQuestionnaireData = localStorage.getItem('vocabularyTestFormData');
      const hasRegistrationData = localStorage.getItem('registrationId') && localStorage.getItem('userNickname');
      
      if (hasQuestionnaireData && !hasRegistrationData) {
        // This is the problematic case: questionnaire data exists but no registration data
        // Clear everything and start fresh
        console.log('Detected corrupted state: questionnaire data without registration data. Clearing localStorage.');
        localStorage.removeItem('vocabularyTestFormData');
        localStorage.removeItem('registrationId');
        localStorage.removeItem('userNickname');
      }
      // Otherwise keep the data (user might have been working on it and reloaded)
      
      // Update visit timestamp
      localStorage.setItem('lastVisitTime', currentTime.toString());
    } else {
      // This is a reload within the same session - keep all data
      // Update visit timestamp to extend the session
      localStorage.setItem('lastVisitTime', currentTime.toString());
    }
  }
  
  // Clear saved form data
  function clearSavedData() {
    localStorage.removeItem('vocabularyTestFormData');
    localStorage.removeItem('registrationId');
    localStorage.removeItem('userNickname');
    localStorage.removeItem('lastVisitTime');
    
    // Also clear sessionStorage so next visit will be treated as fresh
    sessionStorage.removeItem('hasVisited');
  }
  
  // Run initialization
  init();
  
  // Save form data before page unload/refresh
  window.addEventListener('beforeunload', function() {
    saveFormData();
  });
  
  // Also save data when page visibility changes (mobile browsers)
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      saveFormData();
    }
  });
  
  // Clear timestamp when page is unloaded if test is complete
  window.addEventListener('unload', function() {
    // If we're on the results page, clear timestamp for next visit
    const resultsSection = document.getElementById('results-section');
    if (resultsSection && resultsSection.style.display !== 'none') {
      localStorage.removeItem('lastVisitTime');
    }
  });
});