import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Header,
  PageTitle,
  DropDown,
  Button,
  ErrorMessage,
  convertEnumsToDropDownOption,
  Dialog,
} from '../../../components';
import { getBlankFieldError } from '../../../commons';
import { useSelector, useDispatch } from 'react-redux';
import { initialiseCollab } from '../../../features/User/Collaboration/collaborationSlice';
import {
  QuestionTopic,
  ProgrammingLanguage,
  QuestionDifficultyMatching,
} from '../../../models';
import { getQuestionUser } from '../../../services/Questions';
import {
  startRoomSession,
  getRejoinableRoomSession,
} from '../../../services/Collaboration';

export default function QuestionSetting() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    questionDifficulty: null,
    programmingLanguage: null,
    questionTopic: null,
  });

  const [hasTouched, setHasTouched] = useState({
    questionDifficulty: false,
    programmingLanguage: false,
    questionTopic: false,
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isFormIncomplete =
    !formData.questionDifficulty ||
    !formData.programmingLanguage ||
    !formData.questionTopic;

  const { value: authValue } = useSelector((state: any) => state.authentication);
  const username: string = authValue.username;

  const saveSetting = async () => {
    try {
      setIsLoading(true);

      const questionData = await getQuestionUser(
        formData.questionTopic,
        formData.questionDifficulty,
        formData.programmingLanguage
      );

      dispatch(
        initialiseCollab({
          questionTopic: formData.questionTopic,
          questionDifficulty: formData.questionDifficulty,
          programmingLanguage: formData.programmingLanguage,
          questionTitle: questionData.title,
          question: questionData.description,
        })
      );

      setIsLoading(false);
      return questionData;
    } catch (e: any) {
      setIsLoading(false);

      if (e.response && e.response.status === 404) {
        setIsDialogOpen(true);
      }

      console.error('Fetch failed:', e);
      return null;
    }
  };

  const resetQuestionSettings = () => {
    setFormData({
      questionDifficulty: null,
      programmingLanguage: null,
      questionTopic: null,
    });
    setHasTouched({
      questionDifficulty: false,
      programmingLanguage: false,
      questionTopic: false,
    });
    setIsDialogOpen(false);
  };

  const allErrorMessage = () => {
    let errorMessage = '';
    if (hasTouched.questionDifficulty) {
      errorMessage += getBlankFieldError(
        'Question difficulty',
        formData.questionDifficulty
      );
    }
    if (hasTouched.questionTopic) {
      errorMessage += getBlankFieldError('Question topic', formData.questionTopic);
    }
    if (hasTouched.programmingLanguage) {
      errorMessage += getBlankFieldError(
        'Programming Language',
        formData.programmingLanguage
      );
    }
    return errorMessage;
  };

  const handleChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [id]: value }));
    setHasTouched((prev) => ({ ...prev, [id]: true }));
  };

  const generateSoloId = () => {
    return `solo-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  };

  const handleJustMeClick = async () => {
    dispatch(
      initialiseCollab({
        questionTopic: formData.questionTopic,
        questionDifficulty: formData.questionDifficulty,
        programmingLanguage: formData.programmingLanguage,
      })
    );

    try {
      const existingSession = await getRejoinableRoomSession(username);

      if (existingSession?.roomId && existingSession.status === 'active') {
        dispatch(
          initialiseCollab({
            questionTopic: formData.questionTopic,
            questionDifficulty: formData.questionDifficulty,
            programmingLanguage: formData.programmingLanguage,
            roomId: existingSession.roomId,
            partner: existingSession.partner ?? null,
            matchId: existingSession.matchId ?? null,
            isStale: !!existingSession.isStale,
          })
        );

        localStorage.setItem(
          'collabSession',
          JSON.stringify({
            username: authValue.username,
            role: authValue.role,
            roomId: existingSession.roomId,
            partner: existingSession.partner ?? null,
            question: null,
          })
        );

        navigate('/waiting-room');
        return;
      }
    } catch (err) {
      console.error('Failed to check existing room session', err);
    }

    const questionData = await saveSetting();

    if (questionData) {
      try {
        const matchId = generateSoloId();
        const session = await startRoomSession(username, matchId);

        dispatch(
          initialiseCollab({
            questionTopic: formData.questionTopic,
            questionDifficulty: formData.questionDifficulty,
            programmingLanguage: formData.programmingLanguage,
            questionTitle: questionData.title,
            question: questionData.description,
            roomId: session.roomId,
            partner: null,
            matchId,
            isStale: false,
          })
        );

        localStorage.setItem(
          'collabSession',
          JSON.stringify({
            username: authValue.username,
            role: authValue.role,
            roomId: session.roomId,
            partner: null,
            question: questionData.description,
          })
        );

        navigate('/collaboration');
      } catch (err) {
        console.error('Failed to start room session', err);
      }
    }
  };

  const handleFindFriendClick = async () => {
    const questionData = await saveSetting();
    if (questionData) {
      navigate('/waiting-room');
    }
  };

  return (
    <div>
      <Header displayUserNavigation={true} />
      <Dialog
        title="Change your question settings"
        content="Currently, we do not have questions available to fit the following question requirements. Please modify your question settings."
        canExit={true}
        isVisible={isDialogOpen}
        haveButton={true}
        buttonWords="OK"
        buttonActions={resetQuestionSettings}
      />
      <div className="p-12">
        <PageTitle text="Start Practicing" />
        <div className="flex flex-col justify-center p-4 gap-y-3 items-center">
          <DropDown
            id="programmingLanguage"
            label="Programming Language"
            value={formData.programmingLanguage}
            items={convertEnumsToDropDownOption(ProgrammingLanguage)}
            onChange={(e) => handleChange('programmingLanguage', e)}
          />
          <DropDown
            id="questionTopic"
            label="Question Topic"
            items={convertEnumsToDropDownOption(QuestionTopic)}
            value={formData.questionTopic}
            onChange={(e) => handleChange('questionTopic', e)}
          />
          <DropDown
            id="questionDifficulty"
            label="Question Difficulty"
            value={formData.questionDifficulty}
            items={convertEnumsToDropDownOption(QuestionDifficultyMatching)}
            onChange={(e) => handleChange('questionDifficulty', e)}
          />
          <ErrorMessage text={allErrorMessage()} />
          <div className="flex justify-center p-4 gap-x-15">
            <Button
              label={isLoading ? 'Loading...' : 'Just Me'}
              onClick={handleJustMeClick}
              disabled={allErrorMessage() !== '' || isFormIncomplete || isLoading}
            />
            <Button
              label={isLoading ? 'Loading...' : 'Find a Friend'}
              onClick={handleFindFriendClick}
              disabled={allErrorMessage() !== '' || isFormIncomplete || isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}